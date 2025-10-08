
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { decrypt } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        if (!ObjectId.isValid(params.id)) {
            return NextResponse.json({ message: 'Invalid appointment ID format.' }, { status: 400 });
        }

        const token = req.headers.get('authorization')?.split(' ')[1];
        if (!token) {
            return NextResponse.json({ message: 'Authorization token missing.' }, { status: 401 });
        }
        const userPayload = await decrypt(token);
        if (!userPayload?.userId) {
            return NextResponse.json({ message: 'Invalid or expired token.' }, { status: 401 });
        }
        
        const body = await req.json();
        const { patientId, scheduledTime, notes, appointmentType } = body;

        if (!patientId || !scheduledTime || !appointmentType) {
            return NextResponse.json({ message: 'Missing required fields: patientId, scheduledTime, appointmentType.' }, { status: 400 });
        }
        
        if (!ObjectId.isValid(patientId)) {
            return NextResponse.json({ message: 'Invalid patient ID format.' }, { status: 400 });
        }

        const { db } = await connectToDatabase();
        
        const updatePayload = {
            patientId: new ObjectId(patientId),
            scheduledTime: new Date(scheduledTime),
            notes: notes,
            appointmentType,
            updatedAt: new Date(),
        };

        const result = await db.collection('appointments').updateOne(
            { _id: new ObjectId(params.id) },
            { $set: updatePayload }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json({ message: 'Appointment not found.' }, { status: 404 });
        }

        const updatedAppointment = await db.collection('appointments').findOne({ _id: new ObjectId(params.id) });

        return NextResponse.json(updatedAppointment, { status: 200 });

    } catch (error) {
        console.error('Failed to update appointment:', error);
        return NextResponse.json({ message: 'Internal Server Error', error: (error as Error).message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        if (!ObjectId.isValid(params.id)) {
            return NextResponse.json({ message: 'Invalid appointment ID format.' }, { status: 400 });
        }

        const token = req.headers.get('authorization')?.split(' ')[1];
        if (!token) {
            return NextResponse.json({ message: 'Authorization token missing.' }, { status: 401 });
        }
        const userPayload = await decrypt(token);
        if (!userPayload?.userId) {
            return NextResponse.json({ message: 'Invalid or expired token.' }, { status: 401 });
        }

        const { db } = await connectToDatabase();
        const result = await db.collection('appointments').deleteOne({ _id: new ObjectId(params.id) });

        if (result.deletedCount === 0) {
            return NextResponse.json({ message: 'Appointment not found.' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Appointment deleted successfully.' }, { status: 200 });

    } catch (error) {
        console.error('Failed to delete appointment:', error);
        return NextResponse.json({ message: 'Internal Server Error', error: (error as Error).message }, { status: 500 });
    }
}
