
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { decrypt } from '@/lib/auth';
import type { ClientAuditLog } from '@/lib/types';

export async function GET(req: NextRequest) {
    try {
        const token = req.headers.get('authorization')?.split(' ')[1];
        if (!token) return NextResponse.json({ message: 'Authorization token missing.' }, { status: 401 });

        const userPayload = await decrypt(token);
        if (userPayload?.role !== 'manager') {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const entityId = searchParams.get('entityId'); // Can be accession # or MRN

        if (!entityId) {
            return NextResponse.json({ message: 'Missing required query parameter: entityId' }, { status: 400 });
        }
        
        const { db } = await connectToDatabase();

        // Step 1: Find the relevant order or patient document ID
        // This is a simplified search. A real system might need more complex logic.
        let documentId: ObjectId | null = null;
        if (ObjectId.isValid(entityId)) {
            documentId = new ObjectId(entityId);
        } else {
             const order = await db.collection('orders').findOne({ 'samples.accessionNumber': entityId });
             if (order) {
                 documentId = order._id;
             } else {
                 const patient = await db.collection('patients').findOne({ mrn: entityId });
                 if(patient) {
                     documentId = patient._id;
                 }
             }
        }
        
        if (!documentId) {
            return NextResponse.json([]); // Return empty array if no entity found
        }
        
        // Step 2: Build the aggregation pipeline
        const pipeline = [
            { $match: { 'entity.documentId': documentId } },
            { $sort: { timestamp: -1 } },
            { $limit: 100 },
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } }
        ];

        const logs = await db.collection('auditLogs').aggregate(pipeline).toArray();
        
        const clientLogs: ClientAuditLog[] = logs.map(log => {
            const { _id, userId, entity, userInfo, ...rest } = log;
            return {
                id: _id.toHexString(),
                user: {
                    id: userInfo?._id.toHexString() || 'N/A',
                    name: userInfo ? `${userInfo.firstName} ${userInfo.lastName}` : 'System',
                    role: userInfo?.role || 'system',
                },
                entity: {
                    collectionName: entity.collectionName,
                    documentId: entity.documentId.toHexString(),
                },
                ...rest
            };
        });

        return NextResponse.json(clientLogs, { status: 200 });

    } catch (error) {
        console.error('Failed to fetch audit logs:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
