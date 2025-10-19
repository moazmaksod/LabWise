
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { decrypt } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const token = req.headers.get('authorization')?.split(' ')[1];
        if (!token) {
            return NextResponse.json({ message: 'Authorization token missing.' }, { status: 401 });
        }
        const userPayload = await decrypt(token);
        if (!userPayload?.userId) {
            return NextResponse.json({ message: 'Invalid or expired token.' }, { status: 401 });
        }

        const { db } = await connectToDatabase();
        
        const aggregationPipeline = [
            // Stage 1: Deconstruct the samples array to process each sample individually
            { $unwind: "$samples" },
            // Stage 2: Filter for samples that are currently active in the lab workflow
            { 
                $match: { 
                    "samples.status": { $in: ['InLab', 'Testing', 'AwaitingVerification', 'Verified'] } 
                } 
            },
            // Stage 3: Sort by STAT priority first, then by the time they were received
            { 
                $sort: {
                    "priority": -1, // Sorts 'STAT' (desc) before 'Routine' (asc)
                    "samples.receivedTimestamp": 1 // Oldest first
                } 
            },
            // Stage 4: Limit the number of results to prevent overwhelming the client
            { $limit: 150 },
             // Stage 5: Join with the patients collection to get patient details
            {
                $lookup: {
                    from: 'patients',
                    localField: 'patientId',
                    foreignField: '_id',
                    as: 'patientInfo'
                }
            },
            { $unwind: { path: "$patientInfo", preserveNullAndEmptyArrays: true } },
            // Stage 6: Project the final, clean shape for the worklist item
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
                    // Calculate a due timestamp (e.g., 4 hours after receipt)
                    dueTimestamp: { $add: ["$samples.receivedTimestamp", 4 * 60 * 60 * 1000] } 
                }
            },
        ];

        const worklist = await db.collection('orders').aggregate(aggregationPipeline).toArray();
        
        return NextResponse.json(worklist, { status: 200 });

    } catch (error: any) {
        console.error('An unexpected error occurred in /api/v1/worklist:', error);
        return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
    }
}
