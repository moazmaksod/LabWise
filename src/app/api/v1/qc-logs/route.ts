import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { decrypt } from '@/lib/auth';
import type { QCLog } from '@/lib/types';

// GET all QC logs (can be filtered by instrumentId, etc. in future)
export async function GET(req: NextRequest) {
    try {
        const { db } = await connectToDatabase();
        const { searchParams } = new URL(req.url);
        const instrumentId = searchParams.get('instrumentId');
        
        const filter: any = {};
        if (instrumentId && ObjectId.isValid(instrumentId)) {
            filter.instrumentId = new ObjectId(instrumentId);
        }
        
        const logs = await db.collection('qcLogs').find(filter).sort({ runTimestamp: -1 }).limit(100).toArray();
        const clientLogs = logs.map(log => {
            const { _id, ...rest } = log;
            return { ...rest, id: _id.toHexString() };
        });
        return NextResponse.json(clientLogs, { status: 200 });
    } catch (error) {
        console.error('Failed to fetch QC logs:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

// POST a new QC log
export async function POST(req: NextRequest) {
    try {
        const token = req.headers.get('authorization')?.split(' ')[1];
        if (!token) return NextResponse.json({ message: 'Authorization token missing.' }, { status: 401 });
        const userPayload = await decrypt(token);
        if (!userPayload?.userId) return NextResponse.json({ message: 'Invalid or expired token.' }, { status: 401 });

        const body = await req.json();
        const { instrumentId, testCode, qcMaterialLot, resultValue, isPass } = body;

        if (!instrumentId || !testCode || !qcMaterialLot || resultValue === undefined || isPass === undefined) {
            return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
        }
        if (!ObjectId.isValid(instrumentId)) {
             return NextResponse.json({ message: 'Invalid instrument ID format.' }, { status: 400 });
        }

        const { db } = await connectToDatabase();
        
        const newLog: Omit<QCLog, '_id'> = {
            instrumentId: new ObjectId(instrumentId),
            testCode,
            qcMaterialLot,
            resultValue,
            isPass,
            runTimestamp: new Date(),
            performedBy: new ObjectId(userPayload.userId as string),
        };

        const result = await db.collection('qcLogs').insertOne(newLog);
        const createdLog = { ...newLog, _id: result.insertedId };
        const { _id, ...clientLog } = createdLog;

        return NextResponse.json({ ...clientLog, id: _id.toHexString() }, { status: 201 });
    } catch (error) {
        console.error('Failed to create QC log:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
