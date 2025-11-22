
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { decrypt } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const { db } = await connectToDatabase();
        const logs = await db.collection('qcLogs').find({}).sort({ runTimestamp: -1 }).limit(50).toArray();
        
        const clientLogs = logs.map(l => ({
            id: l._id.toHexString(),
            ...l,
            _id: undefined
        }));
        
        return NextResponse.json(clientLogs);
    } catch (error) {
        return NextResponse.json({ message: 'Error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const token = req.headers.get('authorization')?.split(' ')[1];
        if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        const user = await decrypt(token);

        const body = await req.json();
        const { db } = await connectToDatabase();
        
        // Simple Westgard Check (1-2s rule mock)
        const isPass = Math.abs(body.resultValue - body.mean) < (2 * body.sd);

        const result = await db.collection('qcLogs').insertOne({
            ...body,
            isPass,
            performedBy: new ObjectId(user.userId as string),
            runTimestamp: new Date()
        });

        return NextResponse.json({ id: result.insertedId.toHexString(), isPass, ...body });
    } catch (error) {
        return NextResponse.json({ message: 'Error' }, { status: 500 });
    }
}
