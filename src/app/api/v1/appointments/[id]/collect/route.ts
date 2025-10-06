
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { decrypt } from '@/lib/auth';
import type { Appointment, Order } from '@/lib/types';


export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        if (!ObjectId.isValid(params.id)) {
            return NextResponse.json({ message: 'Invalid appointment ID.' }, { status: 400 });
        }

        const token = req.headers.get('authorization')?.split(' ')[1];
        if (!token) return NextResponse.json({ message: 'Authorization token missing.' }, { status: 401 });
        const userPayload = await decrypt(token);
        if (!userPayload?.userId) return NextResponse.json({ message: 'Invalid or expired token.' }, { status: 401 });

        const { db } = await connectToDatabase();
        
        // 1. Update the appointment status to 'Completed'
        const appointmentUpdateResult = await db.collection<Appointment>('appointments').updateOne(
            { _id: new ObjectId(params.id) },
            { $set: { status: 'Completed' } }
        );

        if (appointmentUpdateResult.matchedCount === 0) {
            return NextResponse.json({ message: 'Appointment not found.' }, { status: 404 });
        }
        
        const appointment = await db.collection<Appointment>('appointments').findOne({ _id: new ObjectId(params.id) });
        if (!appointment) {
             return NextResponse.json({ message: 'Appointment not found after update attempt.' }, { status: 404 });
        }

        // 2. Find the most recent order for the patient that is still 'Pending'
        const latestOrder = await db.collection<Order>('orders').findOne(
            { patientId: appointment.patientId, orderStatus: 'Pending' },
            { sort: { createdAt: -1 } }
        );

        if (!latestOrder) {
            // This might not be an error state, could just mean no orders are pending
            return NextResponse.json({ message: 'Collection confirmed, but no pending orders found for this patient.' }, { status: 200 });
        }

        // 3. Update the status of all samples in that order to 'InLab'
        const collectionTimestamp = new Date();
        const sampleUpdateResult = await db.collection<Order>('orders').updateOne(
            { _id: latestOrder._id },
            { 
                $set: { 
                    "samples.$[].status": "InLab",
                    "samples.$[].collectionTimestamp": collectionTimestamp,
                    "samples.$[].receivedTimestamp": collectionTimestamp,
                 }
            }
        );

        if (sampleUpdateResult.modifiedCount === 0) {
            return NextResponse.json({ message: 'Order found, but failed to update sample statuses.' }, { status: 500 });
        }

        // 4. Create an audit log entry
         await db.collection('auditLogs').insertOne({
            timestamp: new Date(),
            userId: new ObjectId(userPayload.userId as string),
            action: 'SAMPLE_COLLECTED',
            entity: {
                collectionName: 'orders',
                documentId: latestOrder._id,
            },
            details: {
                orderId: latestOrder.orderId,
                patientId: latestOrder.patientId.toHexString(),
                message: `Samples for order ${latestOrder.orderId} marked as 'InLab'.`
            },
            ipAddress: req.ip || req.headers.get('x-forwarded-for'),
        });


        return NextResponse.json({ message: 'Collection confirmed successfully.' }, { status: 200 });

    } catch (error) {
        console.error('Failed to confirm collection:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
