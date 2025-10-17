import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/auth';
import { MOCK_TAT_DATA, MOCK_REJECTION_DATA } from '@/lib/constants';

export async function GET(req: NextRequest) {
    try {
        const token = req.headers.get('authorization')?.split(' ')[1];
        if (!token) {
            return NextResponse.json({ message: 'Authorization token missing.' }, { status: 401 });
        }
        const userPayload = await decrypt(token);
        // This endpoint is protected by middleware, so we can assume role is manager if we reach here
        if (!userPayload?.userId || userPayload.role !== 'manager') {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        // In a real application, you would perform complex aggregation queries here.
        // For this sprint, we will return mock data.
        const kpiData = {
            averageTat: {
                stat: 28,
                routine: 122
            },
            rejectionRate: 2.1,
            instrumentUptime: 99.2,
            staffWorkload: 8.4,
            tatHistory: MOCK_TAT_DATA,
            rejectionReasons: MOCK_REJECTION_DATA
        };

        return NextResponse.json(kpiData, { status: 200 });

    } catch (error) {
        console.error('Failed to fetch KPI data:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
