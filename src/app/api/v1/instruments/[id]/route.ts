import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// GET a single instrument
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const id = params.id;
        if (!ObjectId.isValid(id)) {
            return NextResponse.json({ message: 'Invalid instrument ID format.' }, { status: 400 });
        }
        const { db } = await connectToDatabase();
        const instrument = await db.collection('instruments').findOne({ _id: new ObjectId(id) });
        if (!instrument) {
            return NextResponse.json({ message: 'Instrument not found.' }, { status: 404 });
        }
        const { _id, ...rest } = instrument;
        return NextResponse.json({ ...rest, id: _id.toHexString() }, { status: 200 });
    } catch (error) {
        console.error(`Failed to fetch instrument ${params.id}:`, error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

// PUT (update) an instrument
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const id = params.id;
        if (!ObjectId.isValid(id)) {
            return NextResponse.json({ message: 'Invalid instrument ID format.' }, { status: 400 });
        }
        const { db } = await connectToDatabase();
        const body = await req.json();
        const { instrumentId, name, model, status, lastCalibrationDate } = body;
        
        const updateData: any = {};
        if (instrumentId) updateData.instrumentId = instrumentId;
        if (name) updateData.name = name;
        if (model) updateData.model = model;
        if (status) updateData.status = status;
        if (lastCalibrationDate) updateData.lastCalibrationDate = new Date(lastCalibrationDate);
        updateData.updatedAt = new Date();

        const result = await db.collection('instruments').updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json({ message: 'Instrument not found.' }, { status: 404 });
        }
        return NextResponse.json({ message: 'Instrument updated successfully' }, { status: 200 });
    } catch (error) {
        console.error(`Failed to update instrument ${params.id}:`, error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

// DELETE an instrument
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const id = params.id;
        if (!ObjectId.isValid(id)) {
            return NextResponse.json({ message: 'Invalid instrument ID format.' }, { status: 400 });
        }
        const { db } = await connectToDatabase();
        const result = await db.collection('instruments').deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) {
            return NextResponse.json({ message: 'Instrument not found.' }, { status: 404 });
        }
        return NextResponse.json({ message: 'Instrument deleted successfully' }, { status: 200 });
    } catch (error) {
        console.error(`Failed to delete instrument ${params.id}:`, error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
