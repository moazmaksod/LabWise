import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { decrypt } from '@/lib/auth';
import type { Instrument } from '@/lib/types';

// GET all instruments
export async function GET(req: NextRequest) {
    try {
        const { db } = await connectToDatabase();
        const instruments = await db.collection('instruments').find({}).sort({ name: 1 }).toArray();
        const clientInstruments = instruments.map(inst => {
            const { _id, ...rest } = inst;
            return { ...rest, id: _id.toHexString() };
        });
        return NextResponse.json(clientInstruments, { status: 200 });
    } catch (error) {
        console.error('Failed to fetch instruments:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

// POST a new instrument
export async function POST(req: NextRequest) {
    try {
        const token = req.headers.get('authorization')?.split(' ')[1];
        if (!token) {
            return NextResponse.json({ message: 'Authorization token missing.' }, { status: 401 });
        }
        const userPayload = await decrypt(token);
        if (!userPayload?.userId) {
            return NextResponse.json({ message: 'Invalid or expired token.' }, { status: 401 });
        }
        
        const body = await req.json();
        const { instrumentId, name, model, status, lastCalibrationDate } = body;

        if (!instrumentId || !name || !model || !status) {
            return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
        }

        const { db } = await connectToDatabase();
        
        const existing = await db.collection('instruments').findOne({ instrumentId });
        if (existing) {
            return NextResponse.json({ message: 'An instrument with this ID already exists.' }, { status: 409 });
        }
        
        const newInstrument: Omit<Instrument, '_id'> = {
            instrumentId,
            name,
            model,
            status,
            lastCalibrationDate: new Date(lastCalibrationDate),
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = await db.collection('instruments').insertOne(newInstrument);
        const createdInstrument = { ...newInstrument, _id: result.insertedId };
        
        const { _id, ...clientInstrument } = createdInstrument;

        return NextResponse.json({ ...clientInstrument, id: _id.toHexString() }, { status: 201 });
    } catch (error) {
        console.error('Failed to create instrument:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
