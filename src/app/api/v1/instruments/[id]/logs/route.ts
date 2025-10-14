
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { decrypt } from '@/lib/auth';
import type { MaintenanceLog } from '@/lib/types';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const id = params.id;
        if (!ObjectId.isValid(id)) {
            return NextResponse.json({ message: 'Invalid instrument ID format.' }, { status: 400 });
        }

        const token = req.headers.get('authorization')?.split(' ')[1];
        if (!token) {
            return NextResponse.json({ message: 'Authorization token missing.' }, { status: 401 });
        }
        const userPayload = await decrypt(token);
        if (!userPayload?.userId) {
            return NextResponse.json({ message: 'Invalid or expired token.' }, { status: 401 });
        }

        const { db } = await connectToDatabase();
        
        const body = await req.json();
        const { logType, description } = body;

        if (!logType || !description) {
            return NextResponse.json({ message: 'Missing required fields: logType and description.' }, { status: 400 });
        }
        
        const newLogEntry: MaintenanceLog = {
            logType,
            description,
            performedBy: new ObjectId(userPayload.userId as string),
            timestamp: new Date(),
        };

        const result = await db.collection('instruments').updateOne(
            { _id: new ObjectId(id) },
            { $push: { maintenanceLogs: newLogEntry } }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json({ message: 'Instrument not found.' }, { status: 404 });
        }

        await db.collection('auditLogs').insertOne({
            timestamp: new Date(),
            userId: new ObjectId(userPayload.userId as string),
            action: 'MAINTENANCE_LOG_CREATE',
            entity: { collectionName: 'instruments', documentId: new ObjectId(id) },
            details: { log: newLogEntry, message: `New maintenance log added to instrument ${id}.` },
            ipAddress: req.ip || req.headers.get('x-forwarded-for'),
        });

        return NextResponse.json({ message: 'Maintenance log added successfully.' }, { status: 201 });
    } catch (error) {
        console.error(`Failed to add log to instrument ${params.id}:`, error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
