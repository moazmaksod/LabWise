
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { decrypt } from '@/lib/auth';
import type { Order, OrderTest } from '@/lib/types';

function isAbnormal(value: any, range: string | undefined): boolean {
    if (!range) return false;
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) return false;

    const parts = range.split('-').map(p => parseFloat(p.trim()));
    if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return false;

    const [low, high] = parts;
    return numericValue < low || numericValue > high;
}

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
        
        // Prevent re-verification of an already verified sample
        if (order.samples[sampleIndex].status === 'Verified') {
            return NextResponse.json({ message: 'This sample has already been fully verified.' }, { status: 409 });
        }

        const updates: any = {};
        let allTestsInSampleAreNowVerified = true;

        for (const result of results) {
            const testIndex = order.samples[sampleIndex].tests.findIndex(t => t.testCode === result.testCode);
            if (testIndex !== -1) {
                updates[`samples.${sampleIndex}.tests.${testIndex}.resultValue`] = result.value;
                updates[`samples.${sampleIndex}.tests.${testIndex}.notes`] = result.notes;
                
                const originalTest = order.samples[sampleIndex].tests[testIndex];
                
                // Logic for verification
                const isAbnormalResult = isAbnormal(result.value, originalTest.referenceRange);
                // Simulate a delta check failure for demonstration purposes
                const failsDeltaCheck = Math.random() < 0.05; // 5% chance of failing delta check
                const isManualReviewRequired = isAbnormalResult || failsDeltaCheck;

                updates[`samples.${sampleIndex}.tests.${testIndex}.isAbnormal`] = isAbnormalResult;
                
                if (isManualReviewRequired) {
                    updates[`samples.${sampleIndex}.tests.${testIndex}.status`] = 'AwaitingVerification';
                    updates[`samples.${sampleIndex}.tests.${testIndex}.flags`] = failsDeltaCheck ? ['DELTA_CHECK_FAILED'] : [];
                    allTestsInSampleAreNowVerified = false; // This test needs manual review
                } else {
                    updates[`samples.${sampleIndex}.tests.${testIndex}.status`] = 'Verified';
                    updates[`samples.${sampleIndex}.tests.${testIndex}.verifiedBy`] = new ObjectId(userPayload.userId as string);
                    updates[`samples.${sampleIndex}.tests.${testIndex}.verifiedAt`] = new Date();
                    updates[`samples.${sampleIndex}.tests.${testIndex}.flags`] = [];
                }
            }
        }
        
        // Update sample and order status
        if (Object.keys(updates).length > 0) {
            if(allTestsInSampleAreNowVerified) {
                updates[`samples.${sampleIndex}.status`] = 'Verified';
            } else {
                updates[`samples.${sampleIndex}.status`] = 'AwaitingVerification';
            }
            
            await db.collection('orders').updateOne(
                { _id: order._id },
                { $set: updates }
            );

            // After applying updates, refetch the order to check its final state
            const updatedOrder = await db.collection<Order>('orders').findOne({ _id: order._id });
            const allSamplesInOrderVerified = updatedOrder?.samples.every(s => s.status === 'Verified');

            if (allSamplesInOrderVerified) {
                 await db.collection('orders').updateOne(
                    { _id: order._id },
                    { $set: { orderStatus: 'Complete' } }
                );
            } else {
                // If some but not all are done, it's partially complete
                 const someSamplesVerified = updatedOrder?.samples.some(s => s.status === 'Verified');
                 if (someSamplesVerified) {
                      await db.collection('orders').updateOne(
                        { _id: order._id },
                        { $set: { orderStatus: 'Partially Complete' } }
                    );
                 }
            }
        }

        return NextResponse.json({
            message: "Results processed successfully.",
            orderId: order.orderId,
            accessionNumber: accessionNumber,
            newStatus: allTestsInSampleAreNowVerified ? 'Verified' : 'AwaitingVerification'
        }, { status: 200 });

    } catch (error: any) {
        console.error('Result verification failed:', error);
        return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
    }
}
