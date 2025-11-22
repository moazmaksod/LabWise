
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// GET instruments
export async function GET(req: NextRequest) {
    try {
        const { db } = await connectToDatabase();
        const instruments = await db.collection('instruments').find({}).toArray();

        const clientInstruments = instruments.map(i => ({
            id: i._id.toHexString(),
            ...i,
            _id: undefined
        }));

        return NextResponse.json(clientInstruments);
    } catch (error) {
        return NextResponse.json({ message: 'Error' }, { status: 500 });
    }
}

// POST instrument
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { db } = await connectToDatabase();
        const result = await db.collection('instruments').insertOne({
            ...body,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        return NextResponse.json({ id: result.insertedId.toHexString(), ...body });
    } catch (error) {
        return NextResponse.json({ message: 'Error' }, { status: 500 });
    }
}
