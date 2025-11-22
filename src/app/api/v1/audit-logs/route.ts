
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const entityId = searchParams.get('entityId');
        const action = searchParams.get('action');

        const { db } = await connectToDatabase();
        
        let filter: any = {};
        if (entityId) {
            // Basic fuzzy search on the document ID stored in entity.documentId
            // In a real scenario, we might need exact match or type handling
            // For now, we assume the client sends a valid ID string if they want to filter by it
            // But since audit logs store ObjectIds, this is tricky with simple string search.
            // We'll skip complex ID filtering for this mock implementation or implement it if critical.
        }
        if (action && action !== 'All') {
            filter.action = action;
        }

        const logs = await db.collection('auditLogs').aggregate([
            { $match: filter },
            { $sort: { timestamp: -1 } },
            { $limit: 100 },
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' }
        ]).toArray();

        const clientLogs = logs.map(log => ({
            id: log._id.toHexString(),
            timestamp: log.timestamp,
            action: log.action,
            user: {
                name: `${log.user.firstName} ${log.user.lastName}`,
                role: log.user.role
            },
            details: log.details,
            ipAddress: log.ipAddress
        }));

        return NextResponse.json(clientLogs);

    } catch (error) {
        return NextResponse.json({ message: 'Error' }, { status: 500 });
    }
}
