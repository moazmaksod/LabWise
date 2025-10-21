
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

        // In a real application, you would use a library like 'pdf-lib' or 'puppeteer'
        // to generate a PDF from the order data.
        // For this sprint, we will return a placeholder response.
        
        const responseText = `PDF Generation for Order ${order.orderId}\n\nThis is a placeholder for the PDF report. In a real implementation, a PDF file would be generated and returned here.`;

        return new NextResponse(responseText, {
            status: 200,
            headers: {
                'Content-Type': 'text/plain', // Should be 'application/pdf' in production
                'Content-Disposition': `inline; filename="LabReport-${order.orderId}.pdf"`,
            },
        });

    } catch (error) {
        console.error(`Failed to generate PDF for order ${params.id}:`, error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
