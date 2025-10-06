
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
        
        const { sampleId } = await req.json();
        if (!sampleId || !ObjectId.isValid(sampleId)) {
            return NextResponse.json({ message: 'Invalid or missing sampleId.' }, { status: 400 });
        }

        const token = req.headers.get('authorization')?.split(' ')[1];
        if (!token) return NextResponse.json({ message: 'Authorization token missing.' }, { status: 401 });
        const userPayload = await decrypt(token);
        if (!userPayload?.userId) return NextResponse.json({ message: 'Invalid or expired token.' }, { status: 401 });

        const { db } = await connectToDatabase();
        
        const appointment = await db.collection<Appointment>('appointments').findOne({ _id: new ObjectId(params.id) });
        if (!appointment) {
             return NextResponse.json({ message: 'Appointment not found.' }, { status: 404 });
        }

        // Find the order that contains this sample
        const orderContainingSample = await db.collection<Order>('orders').findOne(
            { "samples.sampleId": new ObjectId(sampleId) }
        );

        if (!orderContainingSample) {
            return NextResponse.json({ message: 'Order containing the specified sample not found.' }, { status: 404 });
        }

        // Update the status of the specific sample in that order to 'InLab'
        const collectionTimestamp = new Date();
        const sampleUpdateResult = await db.collection<Order>('orders').updateOne(
            { "samples.sampleId": new ObjectId(sampleId) },
            { 
                $set: { 
                    "samples.$.status": "InLab",
                    "samples.$.collectionTimestamp": collectionTimestamp,
                    "samples.$.receivedTimestamp": collectionTimestamp,
                 }
            }
        );

        if (sampleUpdateResult.modifiedCount === 0) {
            return NextResponse.json({ message: 'Order found, but failed to update sample status. It might have been collected already.' }, { status: 500 });
        }
        
        // After updating the sample, check if all samples in the order are now 'InLab' or beyond.
        const updatedOrder = await db.collection<Order>('orders').findOne({ _id: orderContainingSample._id });
        const allSamplesCollected = updatedOrder?.samples.every(s => s.status !== 'AwaitingCollection');

        if (allSamplesCollected) {
             await db.collection<Appointment>('appointments').updateOne(
                { _id: new ObjectId(params.id) },
                { $set: { status: 'Completed' } }
            );
        }

        // Create an audit log entry
         await db.collection('auditLogs').insertOne({
            timestamp: new Date(),
            userId: new ObjectId(userPayload.userId as string),
            action: 'SAMPLE_COLLECTED',
            entity: {
                collectionName: 'orders',
                documentId: orderContainingSample._id,
            },
            details: {
                orderId: orderContainingSample.orderId,
                patientId: orderContainingSample.patientId.toHexString(),
                sampleId: sampleId,
                message: `Sample ${sampleId} for order ${orderContainingSample.orderId} marked as 'InLab'.`
            },
            ipAddress: req.ip || req.headers.get('x-forwarded-for'),
        });


        return NextResponse.json({ message: 'Collection confirmed successfully.' }, { status: 200 });

    } catch (error) {
        console.error('Failed to confirm collection:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
