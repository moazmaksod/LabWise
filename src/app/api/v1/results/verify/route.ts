
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { decrypt } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        const token = req.headers.get('authorization')?.split(' ')[1];
        if (!token) return NextResponse.json({ message: 'Authorization token missing.' }, { status: 401 });
        const userPayload = await decrypt(token);
        if (!userPayload?.userId) return NextResponse.json({ message: 'Invalid or expired token.' }, { status: 401 });

        const { accessionNumber, results } = await req.json(); // results: [{ testCode, value, notes }]

        if (!accessionNumber || !results || !Array.isArray(results)) {
            return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
        }

        const { db } = await connectToDatabase();

        // 1. Find the order containing this sample
        const order = await db.collection('orders').findOne({ "samples.accessionNumber": accessionNumber });
        if (!order) {
            return NextResponse.json({ message: 'Sample not found.' }, { status: 404 });
        }

        const sampleIndex = order.samples.findIndex((s: any) => s.accessionNumber === accessionNumber);
        const sample = order.samples[sampleIndex];

        // 2. Process each result
        let anyAbnormal = false;
        let anyDeltaFailure = false;

        const updatedTests = sample.tests.map((test: any) => {
            const resultInput = results.find((r: any) => r.testCode === test.testCode);
            if (!resultInput) return test; // No result for this test yet

            let isAbnormal = false;
            let flags = test.flags || [];

            // Parse value (simple numeric check for now)
            const numValue = parseFloat(resultInput.value);

            // Check Reference Range (very basic parsing "Low - High")
            if (!isNaN(numValue) && test.referenceRange && test.referenceRange !== 'N/A') {
                const [low, high] = test.referenceRange.split(' - ').map(parseFloat);
                if (!isNaN(low) && !isNaN(high)) {
                    if (numValue < low || numValue > high) {
                        isAbnormal = true;
                        anyAbnormal = true;
                    }
                }
            }

            // --- DELTA CHECK LOGIC (Simplified) ---
            // In a real app, we'd query the *previous* order for this patient and testCode.
            // Here we just simulate it: if value > 100, flag it.
            if (numValue > 100) { // Mock rule
                 // In production: compare with db.collection('orders').findOne({ patientId: order.patientId, ... sort: -1 })
                 // For now, we assume anything over 100 is a massive change for our mock tests
                 // flags.push('DELTA_CHECK_FAILED');
                 // anyDeltaFailure = true;
            }
            
            return {
                ...test,
                resultValue: resultInput.value,
                notes: resultInput.notes,
                isAbnormal,
                flags,
                status: 'Verified', // We are "verifying" immediately in this MVP step
                verifiedBy: new ObjectId(userPayload.userId as string),
                verifiedAt: new Date()
            };
        });

        // 3. Update Database
        // Determine if all tests in sample are done
        const allTestsComplete = updatedTests.every((t: any) => t.status === 'Verified');
        const newSampleStatus = allTestsComplete ? 'Verified' : 'Testing';

        await db.collection('orders').updateOne(
            { _id: order._id },
            {
                $set: {
                    [`samples.${sampleIndex}.tests`]: updatedTests,
                    [`samples.${sampleIndex}.status`]: newSampleStatus
                }
            }
        );

        // --- Audit Log ---
        await db.collection('auditLogs').insertOne({
            timestamp: new Date(),
            userId: new ObjectId(userPayload.userId as string),
            action: 'RESULTS_VERIFIED',
            entity: { collectionName: 'orders', documentId: order._id },
            details: { accessionNumber, verifiedCount: results.length }
        });

        return NextResponse.json({ message: 'Results verified successfully.' });

    } catch (error) {
        console.error('Result verification failed:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
