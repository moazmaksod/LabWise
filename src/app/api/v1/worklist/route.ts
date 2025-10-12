
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(req: NextRequest) {
    try {
        const { db } = await connectToDatabase();
        
        // Find all orders that have at least one sample with status 'InLab' or 'Testing'
        const aggregationPipeline = [
            // Deconstruct the samples array to work with each sample individually
            { $unwind: "$samples" },
            // Filter for samples that are in the worklist
            {
                $match: {
                    "samples.status": { $in: ['InLab', 'Testing'] }
                }
            },
            // Lookup patient information for each sample's order
            {
                $lookup: {
                    from: 'patients',
                    localField: 'patientId',
                    foreignField: '_id',
                    as: 'patientInfo'
                }
            },
            // Deconstruct the patientInfo array
            { $unwind: { path: "$patientInfo", preserveNullAndEmptyArrays: true } },
            // Sort the samples: STAT first, then by when they were received
            { 
                $sort: {
                    "priority": -1, // STAT will come before Routine
                    "samples.receivedTimestamp": 1 // Oldest received first
                }
            },
             // Reshape the document to be more client-friendly
            {
                $project: {
                    _id: 0,
                    sampleId: "$samples.sampleId",
                    accessionNumber: "$samples.accessionNumber",
                    patientName: { $concat: ["$patientInfo.firstName", " ", "$patientInfo.lastName"] },
                    patientId: "$patientInfo.mrn",
                    tests: "$samples.tests",
                    status: "$samples.status",
                    priority: "$priority",
                    receivedTimestamp: "$samples.receivedTimestamp",
                    dueTimestamp: { $add: ["$samples.receivedTimestamp", 1000 * 60 * 60 * 4] } // Example: due 4 hours after receipt
                }
            },
            { $limit: 100 } // Add pagination limit
        ];
        
        const worklist = await db.collection('orders').aggregate(aggregationPipeline).toArray();

        return NextResponse.json(worklist, { status: 200 });

    } catch (error) {
        console.error('Failed to fetch worklist:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
