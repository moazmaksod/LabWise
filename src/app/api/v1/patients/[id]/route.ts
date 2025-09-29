
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Patient } from '@/lib/types';

// GET a single patient by ID
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { db } = await connectToDatabase();
        
        if (!ObjectId.isValid(params.id)) {
            return NextResponse.json({ message: 'Invalid patient ID format.' }, { status: 400 });
        }

        const patient = await db.collection('patients').findOne({ _id: new ObjectId(params.id) });

        if (!patient) {
            return NextResponse.json({ message: 'Patient not found.' }, { status: 404 });
        }
        
        const { _id, ...clientPatient } = patient;
        const result = { ...clientPatient, id: _id.toHexString() };

        return NextResponse.json(result);
    } catch (error) {
        console.error(`Failed to fetch patient ${params.id}:`, error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
