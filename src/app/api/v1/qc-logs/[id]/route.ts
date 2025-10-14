import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// GET a single QC log
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const id = params.id;
        if (!ObjectId.isValid(id)) {
            return NextResponse.json({ message: 'Invalid QC log ID format.' }, { status: 400 });
        }
        const { db } = await connectToDatabase();
        const log = await db.collection('qcLogs').findOne({ _id: new ObjectId(id) });
        if (!log) {
            return NextResponse.json({ message: 'QC log not found.' }, { status: 404 });
        }
        const { _id, ...rest } = log;
        return NextResponse.json({ ...rest, id: _id.toHexString() }, { status: 200 });
    } catch (error) {
        console.error(`Failed to fetch QC log ${params.id}:`, error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

// PUT (update) a QC log (e.g., to add corrective action)
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const id = params.id;
        if (!ObjectId.isValid(id)) {
            return NextResponse.json({ message: 'Invalid QC log ID format.' }, { status: 400 });
        }
        const { db } = await connectToDatabase();
        const body = await req.json();
        
        const updateData: any = {};
        if (body.correctiveAction) updateData.correctiveAction = body.correctiveAction;
        
        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ message: 'No update data provided.' }, { status: 400 });
        }

        const result = await db.collection('qcLogs').updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json({ message: 'QC log not found.' }, { status: 404 });
        }
        return NextResponse.json({ message: 'QC log updated successfully' }, { status: 200 });
    } catch (error) {
        console.error(`Failed to update QC log ${params.id}:`, error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
