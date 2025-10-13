
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { decrypt } from '@/lib/auth';

export async function GET(req: NextRequest) {
    console.log('\n--- [GET /api/v1/worklist] ---');
    try {
        const token = req.headers.get('authorization')?.split(' ')[1];
        if (!token) {
            console.error('[DEBUG] 1. Authorization token missing.');
            return NextResponse.json({ message: 'Authorization token missing.' }, { status: 401 });
        }
        const userPayload = await decrypt(token);
        if (!userPayload?.userId) {
            console.error('[DEBUG] 1. Invalid or expired token.');
            return NextResponse.json({ message: 'Invalid or expired token.' }, { status: 401 });
        }
        console.log(`[DEBUG] 1. User authenticated: role=${userPayload.role}, userId=${userPayload.userId}`);


        const { db } = await connectToDatabase();
        console.log('[DEBUG] 2. Database connection successful.');
        
        const aggregationPipeline = [
            // Stage 1: Deconstruct the samples array
            { $unwind: "$samples" },
            // Stage 2: Filter for samples that belong on the worklist
            { 
                $match: { 
                    "samples.status": { $in: ['InLab', 'Testing', 'AwaitingVerification'] } 
                } 
            },
            // Stage 3: Add patient info
            {
                $lookup: {
                    from: 'patients',
                    localField: 'patientId',
                    foreignField: '_id',
                    as: 'patientInfo'
                }
            },
            { $unwind: { path: "$patientInfo", preserveNullAndEmptyArrays: true } },
            // Stage 4: Sort by STAT first, then by oldest received
            { 
                $sort: {
                    "priority": -1, // This will put "STAT" before "Routine"
                    "samples.receivedTimestamp": 1 
                } 
            },
            // Stage 5: Project the final shape for the client
            {
                $project: {
                    _id: 0, // Exclude the default _id
                    sampleId: "$samples.sampleId",
                    accessionNumber: "$samples.accessionNumber",
                    patientName: { $concat: ["$patientInfo.firstName", " ", "$patientInfo.lastName"] },
                    patientMrn: "$patientInfo.mrn",
                    tests: "$samples.tests",
                    status: "$samples.status",
                    priority: "$priority",
                    receivedTimestamp: "$samples.receivedTimestamp",
                    // Example: due 4 hours after receipt. Adjust as needed.
                    dueTimestamp: { $add: ["$samples.receivedTimestamp", 4 * 60 * 60 * 1000] } 
                }
            },
            // Stage 6: Limit the results
            { $limit: 100 }
        ];

        console.log('[DEBUG] 3. Aggregation pipeline constructed:', JSON.stringify(aggregationPipeline, null, 2));

        const worklist = await db.collection('orders').aggregate(aggregationPipeline).toArray();
        console.log(`[DEBUG] 4. Aggregation executed. Found ${worklist.length} worklist items.`);
        
        if (worklist.length > 0) {
            console.log('[DEBUG] 5. First worklist item (raw from DB):', JSON.stringify(worklist[0], null, 2));
        }

        console.log('[DEBUG] 6. Sending successful response.');
        console.log('--- [END GET /api/v1/worklist] ---');
        return NextResponse.json(worklist, { status: 200 });

    } catch (error: any) {
        console.error('[FATAL] An unexpected error occurred in /api/v1/worklist:', error);
        console.log('--- [END GET /api/v1/worklist with ERROR] ---');
        return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
    }
}
