
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { subDays } from 'date-fns';

export async function GET(req: NextRequest) {
    try {
        const { db } = await connectToDatabase();

        // 1. Turnaround Time (TAT) - Average time from Received to Verified in last 7 days
        const sevenDaysAgo = subDays(new Date(), 7);

        const tatPipeline = [
            { $unwind: '$samples' },
            { $unwind: '$samples.tests' },
            {
                $match: {
                    'samples.tests.status': 'Verified',
                    'samples.receivedTimestamp': { $gte: sevenDaysAgo }
                }
            },
            {
                $project: {
                    tatMinutes: {
                        $divide: [
                            { $subtract: ['$samples.tests.verifiedAt', '$samples.receivedTimestamp'] },
                            60000
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    avgTAT: { $avg: '$tatMinutes' }
                }
            }
        ];
        const tatResult = await db.collection('orders').aggregate(tatPipeline).toArray();
        const avgTAT = tatResult.length > 0 ? Math.round(tatResult[0].avgTAT) : 0;

        // 2. Sample Rejection Rate - % of samples rejected
        const rejectionPipeline = [
            { $unwind: '$samples' },
            {
                $group: {
                    _id: null,
                    totalSamples: { $sum: 1 },
                    rejectedSamples: {
                        $sum: { $cond: [{ $eq: ['$samples.status', 'Rejected'] }, 1, 0] }
                    }
                }
            }
        ];
        const rejResult = await db.collection('orders').aggregate(rejectionPipeline).toArray();
        const rejectionRate = rejResult.length > 0 ? ((rejResult[0].rejectedSamples / rejResult[0].totalSamples) * 100).toFixed(1) : 0;

        // 3. Instrument Status Counts
        const instrumentStatus = await db.collection('instruments').aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]).toArray();
        
        // 4. Pending Orders Count
        const pendingOrders = await db.collection('orders').countDocuments({ orderStatus: 'Pending' });

        return NextResponse.json({
            avgTAT,
            rejectionRate,
            instrumentStatus,
            pendingOrders
        });

    } catch (error) {
        console.error('KPI Fetch Error:', error);
        return NextResponse.json({ message: 'Error fetching KPIs' }, { status: 500 });
    }
}
