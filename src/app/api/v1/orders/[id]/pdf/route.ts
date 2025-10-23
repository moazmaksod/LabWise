
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { decrypt } from '@/lib/auth';
import type { Order } from '@/lib/types';

// GET a PDF for a single order by ID
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const id = params.id;
    try {
        if (!ObjectId.isValid(id)) {
            return NextResponse.json({ message: 'Invalid order ID format.' }, { status: 400 });
        }

        const token = req.headers.get('authorization')?.split(' ')[1];
        if (!token) return NextResponse.json({ message: 'Authorization token missing.' }, { status: 401 });
        const userPayload = await decrypt(token);
        if (!userPayload?.userId) return NextResponse.json({ message: 'Invalid or expired token.' }, { status: 401 });
        
        const { db } = await connectToDatabase();
        const order = await db.collection<Order>('orders').findOne({ _id: new ObjectId(id) });

        if (!order) {
            return NextResponse.json({ message: 'Order not found.' }, { status: 404 });
        }

        // --- RBAC CHECK ---
        const userRole = userPayload.role;
        if (userRole === 'physician' && order.physicianId.toHexString() !== userPayload.userId) {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }
        if (userRole === 'patient') {
            const patient = await db.collection('patients').findOne({ _id: order.patientId });
            if (patient?.userId?.toHexString() !== userPayload.userId) {
                return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
            }
        }
        // --- END RBAC CHECK ---

        // This is a minimal, valid PDF. It's essentially an empty page.
        // This replaces the plain text placeholder which caused the corruption error.
        const pdfContent = `
%PDF-1.1
1 0 obj
<< /Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<< /Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<< /Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<< /Length 52 >>
stream
BT
/F1 12 Tf
72 720 Td
(Placeholder PDF for Order ${order.orderId}) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000059 00000 n 
0000000112 00000 n 
0000000190 00000 n 
trailer
<< /Size 5
/Root 1 0 R
>>
startxref
300
%%EOF
        `.trim();

        const buffer = Buffer.from(pdfContent, 'utf-8');

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="LabReport-${order.orderId}.pdf"`,
                'Content-Length': buffer.length.toString(),
            },
        });

    } catch (error) {
        console.error(`Failed to generate PDF for order ${params.id}:`, error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
