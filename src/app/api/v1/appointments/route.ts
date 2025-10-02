
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { decrypt } from '@/lib/auth';
import type { Appointment } from '@/lib/types';


export async function GET(req: NextRequest) {
    try {
        const { db } = await connectToDatabase();
        
        // In a real app, you would filter by date, e.g., for today
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        // For this demo, let's just fetch all appointments as we only have a few.
        // In a real scenario, you'd use:
        const filter = { scheduledTime: { $gte: todayStart, $lte: todayEnd } };
        
        const aggregationPipeline = [
            { $match: filter },
            { $sort: { scheduledTime: 1 } },
            {
                $lookup: {
                    from: 'patients',
                    localField: 'patientId',
                    foreignField: '_id',
                    as: 'patientInfo'
                }
            },
            {
                $unwind: {
                    path: '$patientInfo',
                    preserveNullAndEmptyArrays: true // Keep appointments even if patient is not found (e.g. walk-in slots)
                }
            }
        ];
        
        const appointments = await db.collection('appointments').aggregate(aggregationPipeline).toArray();

        const clientAppointments = appointments.map(appt => {
            const { _id, patientId, ...rest } = appt;
            return { 
                ...rest, 
                id: _id.toHexString(),
                patientId: patientId?.toHexString()
            };
        });

        return NextResponse.json(clientAppointments, { status: 200 });

    } catch (error) {
        console.error('Failed to fetch appointments:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}


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
        const { patientId, scheduledTime, durationMinutes, status, notes } = body;

        if (!patientId || !scheduledTime || !status) {
            return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
        }

        const { db } = await connectToDatabase();

        const newAppointment: Omit<Appointment, '_id'> = {
            patientId: new ObjectId(patientId),
            scheduledTime: new Date(scheduledTime),
            durationMinutes: durationMinutes || 15,
            status,
            notes,
        };

        const result = await db.collection('appointments').insertOne(newAppointment);

        return NextResponse.json({ id: result.insertedId, ...newAppointment }, { status: 201 });

    } catch (error) {
        console.error('Failed to create appointment:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
