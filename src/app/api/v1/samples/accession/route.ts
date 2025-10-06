

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { decrypt } from '@/lib/auth';
import type { Order } from '@/lib/types';


export async function POST(req: NextRequest) {
    try {
        const { orderId, sampleId } = await req.json();

        if (!orderId || !sampleId) {
            return NextResponse.json({ message: 'Missing required fields: orderId and sampleId' }, { status: 400 });
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
        
        // This should be a unique accession number generation logic
        const accessionNumber = `ACC-${Date.now()}`;

        // Find the specific sample and update its status from 'Collected' to 'InLab'
        const updateResult = await db.collection<Order>('orders').updateOne(
            { 
                _id: new ObjectId(orderId), 
                'samples.sampleId': new ObjectId(sampleId),
                'samples.status': 'Collected' // Ensure we are not accessioning a sample that isn't collected yet
            },
            { 
                $set: { 
                    'samples.$.status': 'InLab',
                    'samples.$.accessionNumber': accessionNumber,
                    'samples.$.receivedTimestamp': new Date(),
                }
            }
        );

        if (updateResult.matchedCount === 0) {
            // Check why it failed
            const orderExists = await db.collection('orders').findOne({ _id: new ObjectId(orderId), 'samples.sampleId': new ObjectId(sampleId) });
            if (!orderExists) {
                return NextResponse.json({ message: 'Sample or order not found.' }, { status: 404 });
            }
            // If order exists, the status must not have been 'Collected'
            return NextResponse.json({ message: 'Sample cannot be accessioned. It might not be in "Collected" status or already accessioned.' }, { status: 409 });
        }
        
        // Create an audit log for this event
        await db.collection('auditLogs').insertOne({
            timestamp: new Date(),
            userId: new ObjectId(userPayload.userId as string),
            action: 'SAMPLE_ACCESSIONED',
            entity: {
                collectionName: 'orders',
                documentId: new ObjectId(orderId),
            },
            details: {
                sampleId: sampleId,
                accessionNumber: accessionNumber,
                message: `Sample ${sampleId} assigned accession number ${accessionNumber} and status set to 'InLab'.`
            },
            ipAddress: req.ip || req.headers.get('x-forwarded-for'),
        });


        return NextResponse.json({
            message: "Sample accessioned successfully.",
            accessionNumber: accessionNumber,
            newStatus: "InLab"
        }, { status: 200 });

    } catch (error) {
        console.error('Failed to accession sample:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
