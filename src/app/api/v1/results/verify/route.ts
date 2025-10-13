import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { decrypt } from '@/lib/auth';
import type { Order, OrderTest } from '@/lib/types';

export async function POST(req: NextRequest) {
    try {
        const token = req.headers.get('authorization')?.split(' ')[1];
        if (!token) {
            return NextResponse.json({ message: 'Authorization token missing.' }, { status: 401 });
        }
        const userPayload = await decrypt(token);
        if (!userPayload?.userId) {
            return NextResponse.json({ message: 'Invalid or expired token.' }, { status: 401 });
        }

        const { accessionNumber, results } = await req.json();

        if (!accessionNumber || !results || !Array.isArray(results)) {
            return NextResponse.json({ message: 'Missing accessionNumber or results array.' }, { status: 400 });
        }

        const { db } = await connectToDatabase();
        
        const order = await db.collection<Order>('orders').findOne({ "samples.accessionNumber": accessionNumber });

        if (!order) {
            return NextResponse.json({ message: 'Order with that accession number not found.' }, { status: 404 });
        }
        
        const sampleIndex = order.samples.findIndex(s => s.accessionNumber === accessionNumber);
        if (sampleIndex === -1) {
             return NextResponse.json({ message: 'Sample with that accession number not found in the order.' }, { status: 404 });
        }
        
        const updates: any = {};
        let allTestsVerified = true;

        for (const result of results) {
            const testIndex = order.samples[sampleIndex].tests.findIndex(t => t.testCode === result.testCode);
            if (testIndex !== -1) {
                updates[`samples.${sampleIndex}.tests.${testIndex}.resultValue`] = result.value;
                updates[`samples.${sampleIndex}.tests.${testIndex}.notes`] = result.notes;
                
                // Simulate delta check and auto-verification logic
                const isNormal = Math.random() > 0.15; // 85% chance of being normal
                const passesDeltaCheck = Math.random() > 0.05; // 95% chance of passing delta check

                if (isNormal && passesDeltaCheck) {
                    updates[`samples.${sampleIndex}.tests.${testIndex}.status`] = 'Verified';
                    updates[`samples.${sampleIndex}.tests.${testIndex}.verifiedBy`] = new ObjectId(userPayload.userId as string);
                    updates[`samples.${sampleIndex}.tests.${testIndex}.verifiedAt`] = new Date();
                    updates[`samples.${sampleIndex}.tests.${testIndex}.isAbnormal`] = false;
                } else {
                    updates[`samples.${sampleIndex}.tests.${testIndex}.status`] = 'AwaitingVerification';
                    updates[`samples.${sampleIndex}.tests.${testIndex}.isAbnormal`] = !isNormal;
                    updates[`samples.${sampleIndex}.tests.${testIndex}.flags`] = !passesDeltaCheck ? ['DELTA_CHECK_FAILED'] : [];
                    allTestsVerified = false; // A test requires manual review
                }
            }
        }
        
        // Update sample and order status
        if (Object.keys(updates).length > 0) {
            if(allTestsVerified) {
                updates[`samples.${sampleIndex}.status`] = 'Verified';
            } else {
                updates[`samples.${sampleIndex}.status`] = 'AwaitingVerification';
            }
            
            await db.collection('orders').updateOne(
                { _id: order._id },
                { $set: updates }
            );

            // Check if all samples in the order are now verified to update order status
            const updatedOrder = await db.collection<Order>('orders').findOne({ _id: order._id });
            if (updatedOrder && updatedOrder.samples.every(s => s.status === 'Verified')) {
                 await db.collection('orders').updateOne(
                    { _id: order._id },
                    { $set: { orderStatus: 'Complete' } }
                );
            }
        }

        return NextResponse.json({
            message: "Results processed successfully.",
            orderId: order.orderId,
            accessionNumber: accessionNumber,
            newStatus: allTestsVerified ? 'Verified' : 'AwaitingVerification'
        }, { status: 200 });

    } catch (error: any) {
        console.error('Result verification failed:', error);
        return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
    }
}
