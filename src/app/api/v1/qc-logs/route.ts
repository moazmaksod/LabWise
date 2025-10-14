
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { decrypt } from '@/lib/auth';
import type { QCLog } from '@/lib/types';

// Placeholder for QC Lot definitions which would normally come from a 'qcMaterials' collection
const getQCLotSpec = (lotNumber: string) => {
    // In a real system, this would query the database for the lot specs
    return {
        mean: 100,
        sd: 2,
    };
};

// Westgard Rules Engine
const evaluateWestgardRules = (newValue: number, previousValues: number[], mean: number, sd: number): { isPass: boolean, failedRule: string | null } => {
    // Rule 1-3s: One control measurement exceeds the mean ± 3s.
    if (Math.abs(newValue - mean) > 3 * sd) {
        return { isPass: false, failedRule: '1-3s' };
    }

    // Rule 2-2s: Two consecutive control measurements exceed the mean + 2s or the mean - 2s.
    if (previousValues.length > 0) {
        const previousValue = previousValues[0];
        if (
            (newValue > mean + 2 * sd && previousValue > mean + 2 * sd) ||
            (newValue < mean - 2 * sd && previousValue < mean - 2 * sd)
        ) {
            return { isPass: false, failedRule: '2-2s' };
        }
    }

    // Add more rules here (e.g., 4-1s, R-4s) as needed.

    return { isPass: true, failedRule: null };
};


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
        const { instrumentId, testCode, qcMaterialLot, resultValue } = body;

        if (!instrumentId || !testCode || !qcMaterialLot || resultValue === undefined) {
            return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
        }
        if (!ObjectId.isValid(instrumentId)) {
             return NextResponse.json({ message: 'Invalid instrument ID format.' }, { status: 400 });
        }

        const { db } = await connectToDatabase();

        // 1. Get QC Specs and historical data
        const qcSpec = getQCLotSpec(qcMaterialLot);
        const previousRuns = await db.collection<QCLog>('qcLogs')
            .find({
                instrumentId: new ObjectId(instrumentId),
                testCode: testCode,
                qcMaterialLot: qcMaterialLot
            })
            .sort({ runTimestamp: -1 })
            .limit(1) // We only need the last run for 2-2s rule
            .toArray();

        const previousValues = previousRuns.map(run => run.resultValue);

        // 2. Evaluate Westgard Rules
        const { isPass, failedRule } = evaluateWestgardRules(resultValue, previousValues, qcSpec.mean, qcSpec.sd);
        
        const newLog: Omit<QCLog, '_id'> = {
            instrumentId: new ObjectId(instrumentId),
            testCode,
            qcMaterialLot,
            resultValue,
            isPass,
            runTimestamp: new Date(),
            performedBy: new ObjectId(userPayload.userId as string),
        };

        if (!isPass) {
            newLog.correctiveAction = {
                action: `QC Run Failed due to Westgard Rule: ${failedRule}. Patient results held.`,
                documentedBy: new ObjectId(userPayload.userId as string),
                timestamp: new Date()
            }
        }
        
        const result = await db.collection('qcLogs').insertOne(newLog);

        // --- Audit Log ---
        await db.collection('auditLogs').insertOne({
            timestamp: new Date(),
            userId: new ObjectId(userPayload.userId as string),
            action: 'QC_RUN_LOGGED',
            entity: { collectionName: 'qcLogs', documentId: result.insertedId },
            details: {
                ...newLog,
                isPass: isPass,
                failedRule: failedRule,
                message: `QC run for ${testCode} on instrument ${instrumentId}. Result: ${resultValue}. Pass: ${isPass}.`
            },
            ipAddress: req.ip || req.headers.get('x-forwarded-for'),
        });
        // --- End Audit Log ---

        const createdLog = { ...newLog, _id: result.insertedId };
        const { _id, ...clientLog } = createdLog;

        return NextResponse.json({ ...clientLog, id: _id.toHexString() }, { status: 201 });
    } catch (error) {
        console.error('Failed to create QC log:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
