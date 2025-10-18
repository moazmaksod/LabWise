
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { decrypt } from '@/lib/auth';
import type { Order } from '@/lib/types';

export async function POST(req: NextRequest) {
    try {
        const { orderId, sampleId, reason } = await req.json();

        if (!orderId || !sampleId || !reason) {
            return NextResponse.json({ message: 'Missing required fields: orderId, sampleId, and reason' }, { status: 400 });
        }
        if (!ObjectId.isValid(orderId) || !ObjectId.isValid(sampleId)) {
            return NextResponse.json({ message: 'Invalid ID format' }, { status: 400 });
        }

        const token = req.headers.get('authorization')?.split(' ')[1];
        if (!token) {
            return NextResponse.json({ message: 'Authorization token missing.' }, { status: 401 });
        }
        const userPayload = await decrypt(token);
        if (!userPayload?.userId) {
            return NextResponse.json({ message: 'Invalid or expired token.' }, { status: 401 });
        }

        const { db } = await connectToDatabase();
        
        const rejectionInfo = {
            reason,
            notifiedUser: 'N/A', // In a real app, this would be captured
            notificationMethod: 'System',
            timestamp: new Date(),
            rejectedBy: new ObjectId(userPayload.userId as string),
        };

        const updateResult = await db.collection<Order>('orders').updateOne(
            { 
                _id: new ObjectId(orderId), 
                'samples.sampleId': new ObjectId(sampleId)
            },
            { 
                $set: { 
                    'samples.$.status': 'Rejected',
                    'samples.$.rejectionInfo': rejectionInfo,
                }
            }
        );

        if (updateResult.matchedCount === 0) {
            return NextResponse.json({ message: 'Sample or order not found.' }, { status: 404 });
        }

        // --- Audit Log Entry ---
        await db.collection('auditLogs').insertOne({
            timestamp: new Date(),
            userId: new ObjectId(userPayload.userId as string),
            action: 'SAMPLE_REJECTED',
            entity: {
                collectionName: 'orders',
                documentId: new ObjectId(orderId),
            },
            details: {
                sampleId: sampleId,
                reason: reason,
                message: `Sample ${sampleId} was rejected. Reason: ${reason}.`
            },
            ipAddress: req.ip || req.headers.get('x-forwarded-for'),
        });
        // --- End Audit Log ---

        return NextResponse.json({ message: 'Sample rejected successfully.' }, { status: 200 });

    } catch (error) {
        console.error('Failed to reject sample:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
