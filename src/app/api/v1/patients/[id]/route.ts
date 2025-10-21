
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Patient } from '@/lib/types';
import { decrypt } from '@/lib/auth';

// GET a single patient by ID
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const id = params.id;
        if (!ObjectId.isValid(id)) {
            return NextResponse.json({ message: 'Invalid patient ID format.' }, { status: 400 });
        }

        // 1. Get user from token
        const token = req.headers.get('authorization')?.split(' ')[1];
        if (!token) {
            return NextResponse.json({ message: 'Authorization token missing.' }, { status: 401 });
        }
        const userPayload = await decrypt(token);
        if (!userPayload?.userId) {
            return NextResponse.json({ message: 'Invalid or expired token.' }, { status: 401 });
        }

        const { db } = await connectToDatabase();
        const patientObjectId = new ObjectId(id);

        const patient = await db.collection<Patient>('patients').findOne({ _id: patientObjectId });

        if (!patient) {
            return NextResponse.json({ message: 'Patient not found.' }, { status: 404 });
        }
        
        // 2. Enforce Security Rules
        const userRole = userPayload.role;
        const userId = userPayload.userId as string;

        if (userRole === 'physician') {
            // A physician can only access a patient they created.
            if (patient.userId?.toHexString() !== userId) {
                 return NextResponse.json({ message: 'Forbidden. You do not have access to this patient record.' }, { status: 403 });
            }
        } else if (userRole !== 'manager' && userRole !== 'receptionist' && userRole !== 'technician' && userRole !== 'phlebotomist') {
            // Other roles (like 'patient') should not be able to access this endpoint freely.
            // Patient access should be through specific order-based routes.
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }
        // Managers, Receptionists, Technicians, and Phlebotomists have access.
        
        const { _id, ...clientPatient } = patient;
        const result = { ...clientPatient, id: _id.toHexString() };

        return NextResponse.json(result);
    } catch (error) {
        console.error(`Failed to fetch patient ${params.id}:`, error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
