
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Patient } from '@/lib/types';

// GET patients (search)
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const query = searchParams.get('q');

        const { db } = await connectToDatabase();
        
        let filter = {};
        if (query) {
            // Basic search: checks for match in MRN, first name, or last name
            const searchRegex = new RegExp(query, 'i');
            filter = {
                $or: [
                    { mrn: searchRegex },
                    { firstName: searchRegex },
                    { lastName: searchRegex },
                ],
            };
        }

        const patients = await db.collection('patients').find(filter).sort({ lastName: 1 }).limit(50).toArray();
        
        const clientPatients = patients.map(patient => {
            const { _id, ...clientPatient } = patient;
            return { ...clientPatient, id: _id.toHexString() };
        });

        return NextResponse.json(clientPatients);
    } catch (error) {
        console.error('Failed to fetch patients:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

// POST a new patient
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Basic validation
        if (!body.mrn || !body.firstName || !body.lastName) {
            return NextResponse.json({ message: 'Missing required fields: mrn, firstName, lastName' }, { status: 400 });
        }

        const { db } = await connectToDatabase();
        
        const existingPatient = await db.collection('patients').findOne({ mrn: body.mrn });
        if (existingPatient) {
            return NextResponse.json({ message: 'A patient with this MRN already exists' }, { status: 409 });
        }
        
        const newPatientDocument: Omit<Patient, '_id'> = {
            ...body,
            dateOfBirth: new Date(body.dateOfBirth),
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        
        const result = await db.collection('patients').insertOne(newPatientDocument);

        return NextResponse.json({ id: result.insertedId.toHexString(), ...newPatientDocument }, { status: 201 });

    } catch (error) {
        console.error('Failed to create patient:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

// PUT (update) a patient
export async function PUT(req: NextRequest) {
    try {
        const { id, ...updateData } = await req.json();

        if (!id) {
            return NextResponse.json({ message: 'Patient ID is required for updates' }, { status: 400 });
        }

        const { db } = await connectToDatabase();
        
        const updatePayload = {
            ...updateData,
            updatedAt: new Date(),
        };
        
        if (updateData.dateOfBirth) {
            updatePayload.dateOfBirth = new Date(updateData.dateOfBirth);
        }
        
        const result = await db.collection('patients').updateOne(
            { _id: new ObjectId(id) },
            { $set: updatePayload }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json({ message: 'Patient not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Patient updated successfully' }, { status: 200 });
    } catch (error) {
        console.error('Failed to update patient:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
