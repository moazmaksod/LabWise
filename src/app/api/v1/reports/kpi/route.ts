
import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { MOCK_TAT_DATA, MOCK_REJECTION_DATA, MOCK_STAFF_WORKLOAD_DATA } from '@/lib/constants';

export async function GET(req: NextRequest) {
    try {
        const token = req.headers.get('authorization')?.split(' ')[1];
        if (!token) {
            return NextResponse.json({ message: 'Authorization token missing.' }, { status: 401 });
        }
        const userPayload = await decrypt(token);
        if (!userPayload?.userId || userPayload.role !== 'manager') {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        const { db } = await connectToDatabase();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // --- Aggregation for Turnaround Time (TAT) ---
        const tatPipeline = [
            { $match: { 'samples.verifiedAt': { $gte: sevenDaysAgo } } },
            { $unwind: "$samples" },
            { $match: { "samples.status": "Verified", "samples.receivedTimestamp": { $exists: true }, "samples.verifiedAt": { $exists: true } } },
            {
                $project: {
                    priority: "$priority",
                    tat: { $divide: [{ $subtract: ["$samples.verifiedAt", "$samples.receivedTimestamp"] }, 60000] } // TAT in minutes
                }
            },
            {
                $group: {
                    _id: "$priority",
                    averageTat: { $avg: "$tat" }
                }
            }
        ];
        const tatResults = await db.collection('orders').aggregate(tatPipeline).toArray();
        
        const averageTat: { stat: number; routine: number } = { stat: 0, routine: 0 };
        tatResults.forEach((result: any) => {
            if (result._id === 'STAT') {
                averageTat.stat = Math.round(result.averageTat);
            } else if (result._id === 'Routine') {
                averageTat.routine = Math.round(result.averageTat);
            }
        });

        // --- Aggregation for Rejection Rate ---
        const rejectionPipeline = [
            { $unwind: "$samples" },
            { $match: { 'samples.rejectionInfo': { $exists: true, $ne: null } } },
            {
                $group: {
                    _id: "$samples.rejectionInfo.reason",
                    count: { $sum: 1 }
                }
            },
            { $project: { _id: 0, reason: "$_id", count: 1 } }
        ];

        const rejectionReasonResults = await db.collection('orders').aggregate(rejectionPipeline).toArray();
        
        const totalSamplesInOrders = await db.collection('orders').aggregate([
            { $unwind: "$samples" },
            { $match: { "samples.status": { $ne: 'AwaitingCollection' } } },
            { $count: "totalSamples" }
        ]).toArray();
        
        const totalSamples = totalSamplesInOrders.length > 0 ? totalSamplesInOrders[0].totalSamples : 0;
        
        const totalRejections = rejectionReasonResults.reduce((sum, item) => sum + (item as any).count, 0);
        const rejectionRate = totalSamples > 0 ? (totalRejections / totalSamples) * 100 : 0;
        
        // --- Get Instrument Status ---
        const instruments = await db.collection('instruments').find({}, { projection: { status: 1 } }).toArray();
        const onlineInstruments = instruments.filter(inst => inst.status === 'Online').length;
        const instrumentUptime = instruments.length > 0 ? (onlineInstruments / instruments.length) * 100 : 100;

        const kpiData = {
            averageTat: averageTat,
            rejectionRate: parseFloat(rejectionRate.toFixed(1)),
            instrumentUptime: parseFloat(instrumentUptime.toFixed(1)),
            staffWorkload: 8.4, // Keep as mock for now
            tatHistory: MOCK_TAT_DATA, // Keep as mock for now
            rejectionReasons: rejectionReasonResults.length > 0 ? rejectionReasonResults : MOCK_REJECTION_DATA,
            workloadDistribution: MOCK_STAFF_WORKLOAD_DATA
        };

        return NextResponse.json(kpiData, { status: 200 });

    } catch (error: any) {
        console.error('Failed to fetch KPI data:', error);
        return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
    }
}
