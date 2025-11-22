
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { decrypt } from '@/lib/auth';
import { getNextSequenceValue } from '@/lib/counters';

export async function POST(req: NextRequest) {
    try {
        const token = req.headers.get('authorization')?.split(' ')[1];
        if (!token) return NextResponse.json({ message: 'Authorization token missing.' }, { status: 401 });
        const userPayload = await decrypt(token);
        if (!userPayload?.userId) return NextResponse.json({ message: 'Invalid or expired token.' }, { status: 401 });

        const { orderId, sampleIndex } = await req.json();

        if (!orderId || sampleIndex === undefined) {
            return NextResponse.json({ message: 'Order ID and sample index are required.' }, { status: 400 });
        }

        const { db } = await connectToDatabase();
        const orderObjectId = new ObjectId(orderId);
        
        const order = await db.collection('orders').findOne({ _id: orderObjectId });
        if (!order) {
            return NextResponse.json({ message: 'Order not found.' }, { status: 404 });
        }

        // Check if sample exists and isn't already accessioned
        const sample = order.samples[sampleIndex];
        if (!sample) {
            return NextResponse.json({ message: 'Sample index out of bounds.' }, { status: 400 });
        }

        if (sample.status !== 'AwaitingCollection' && sample.status !== 'Collected') {
             return NextResponse.json({ message: `Sample is already accessioned (Status: ${sample.status}).` }, { status: 409 });
        }

        // Generate Accession Number
        const year = new Date().getFullYear();
        const seq = await getNextSequenceValue(`accession_${year}`);
        const accessionNumber = `ACC-${year}-${String(seq).padStart(6, '0')}`;
        const receivedTimestamp = new Date();

        // Update the specific sample in the array
        const updateResult = await db.collection('orders').updateOne(
            { _id: orderObjectId },
            { 
                $set: { 
                    [`samples.${sampleIndex}.status`]: 'InLab',
                    [`samples.${sampleIndex}.accessionNumber`]: accessionNumber,
                    [`samples.${sampleIndex}.receivedTimestamp`]: receivedTimestamp,
                    orderStatus: 'In Progress' // Update overall order status
                }
            }
        );

        if (updateResult.modifiedCount === 0) {
             return NextResponse.json({ message: 'Failed to update sample.' }, { status: 500 });
        }

        // --- Audit Log Entry ---
        await db.collection('auditLogs').insertOne({
            timestamp: new Date(),
            userId: new ObjectId(userPayload.userId as string),
            action: 'SAMPLE_ACCESSIONED',
            entity: {
                collectionName: 'orders',
                documentId: orderObjectId,
            },
            details: {
                sampleIndex,
                accessionNumber,
                message: `Sample accessioned with ID ${accessionNumber}.`
            },
            ipAddress: req.ip || req.headers.get('x-forwarded-for'),
        });
        // --- End Audit Log ---

        return NextResponse.json({
            message: 'Sample accessioned successfully.',
            accessionNumber,
            receivedTimestamp
        });

    } catch (error) {
        console.error('Failed to accession sample:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
