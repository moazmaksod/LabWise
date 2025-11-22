
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

// GET worklist (Technician Dashboard)
export async function GET(req: NextRequest) {
    try {
        const { db } = await connectToDatabase();

        // Pipeline to aggregate samples from all active orders
        // We unwind the samples array so we have one document per sample
        // Then we match only samples that are InLab or Testing
        
        const pipeline = [
            { $match: { orderStatus: { $nin: ['Complete', 'Cancelled'] } } },
            { $unwind: '$samples' },
            { 
                $match: { 
                    'samples.status': { $in: ['InLab', 'Testing', 'AwaitingVerification'] }
                } 
            },
            // Join with Patient info
            {
                $lookup: {
                    from: 'patients',
                    localField: 'patientId',
                    foreignField: '_id',
                    as: 'patientInfo'
                }
            },
            { $unwind: '$patientInfo' },
            // Add a sort score based on priority and time
            {
                $addFields: {
                    priorityScore: {
                        $switch: {
                            branches: [
                                { case: { $eq: ['$priority', 'STAT'] }, then: 1 },
                                { case: { $eq: ['samples.status', 'Overdue'] }, then: 2 }, // Logic for overdue calculation would go here in a real app
                                { case: { $eq: ['$priority', 'Routine'] }, then: 3 },
                            ],
                            default: 4
                        }
                    }
                }
            },
            {
                $sort: {
                    priorityScore: 1, // STAT first
                    'samples.receivedTimestamp': 1 // Oldest first (FIFO)
                }
            },
            { $limit: 100 } // Cap at 100 for the dashboard view
        ];

        const worklist = await db.collection('orders').aggregate(pipeline).toArray();

        const clientWorklist = worklist.map(item => ({
            orderId: item.orderId,
            priority: item.priority,
            patientName: `${item.patientInfo.firstName} ${item.patientInfo.lastName}`,
            mrn: item.patientInfo.mrn,
            accessionNumber: item.samples.accessionNumber,
            sampleType: item.samples.sampleType,
            status: item.samples.status,
            tests: item.samples.tests.map((t: any) => t.name).join(', '),
            receivedAt: item.samples.receivedTimestamp,
        }));

        return NextResponse.json(clientWorklist);

    } catch (error) {
        console.error('Failed to fetch worklist:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
