
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { decrypt } from '@/lib/auth';
import type { Appointment } from '@/lib/types';


export async function GET(req: NextRequest) {
    try {
        const { db } = await connectToDatabase();
        
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

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
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    _id: 1,
                    scheduledTime: 1,
                    status: 1,
                    notes: 1,
                    patientId: 1,
                    'patientInfo._id': 1,
                    'patientInfo.firstName': 1,
                    'patientInfo.lastName': 1,
                    'patientInfo.mrn': 1,
                }
            }
        ];
        
        const appointments = await db.collection('appointments').aggregate(aggregationPipeline).toArray();

        const clientAppointments = appointments.map(appt => {
            const { _id, patientId, patientInfo, ...rest } = appt;
            
            const clientPatientInfo = patientInfo ? {
              ...patientInfo,
              id: patientInfo._id.toHexString(),
              _id: undefined,
            } : undefined;

            return { 
                ...rest, 
                id: _id.toHexString(),
                patientId: patientId?.toHexString(),
                patientInfo: clientPatientInfo
            };
        });

        return NextResponse.json(clientAppointments, { status: 200 });

    } catch (error) {
        console.error('Failed to fetch appointments:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}


export async function POST(req: NextRequest) {
    console.log('DEBUG: Received request to create appointment.');
    try {
        const token = req.headers.get('authorization')?.split(' ')[1];
        if (!token) {
            console.log('DEBUG: Authorization token missing.');
            return NextResponse.json({ message: 'Authorization token missing.' }, { status: 401 });
        }
        const userPayload = await decrypt(token);
        if (!userPayload?.userId) {
            console.log('DEBUG: Invalid or expired token.');
            return NextResponse.json({ message: 'Invalid or expired token.' }, { status: 401 });
        }

        const body = await req.json();
        console.log('DEBUG: Request body:', body);

        const { patientId, scheduledTime, durationMinutes, status, notes } = body;

        if (!patientId || !scheduledTime || !status) {
            console.log('DEBUG: Missing required fields.');
            return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
        }
        
        if (!ObjectId.isValid(patientId)) {
            return NextResponse.json({ message: 'Invalid patient ID format.' }, { status: 400 });
        }

        const { db } = await connectToDatabase();

        const newAppointment: Omit<Appointment, '_id'> = {
            patientId: new ObjectId(patientId),
            scheduledTime: new Date(scheduledTime),
            durationMinutes: durationMinutes || 15,
            status: status,
            notes: notes,
        };
        console.log('DEBUG: New appointment document:', newAppointment);

        const result = await db.collection('appointments').insertOne(newAppointment);
        console.log('DEBUG: Insert result:', result);

        const createdAppointment = await db.collection('appointments').aggregate([
            { $match: { _id: result.insertedId } },
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
                    preserveNullAndEmptyArrays: true
                }
            }
        ]).next();

        if (!createdAppointment) {
            console.log('DEBUG: Failed to retrieve created appointment after insert.');
            return NextResponse.json({ message: 'Failed to retrieve created appointment.' }, { status: 500 });
        }
        console.log('DEBUG: Successfully retrieved created appointment with patient info.');
        
        const { _id, ...rest } = createdAppointment;
        const patientInfo = rest.patientInfo ? { ...rest.patientInfo, id: rest.patientInfo._id.toHexString(), _id: undefined } : undefined;
        
        const clientResponse = {
            ...rest,
            id: _id.toHexString(),
            patientInfo
        };

        return NextResponse.json(clientResponse, { status: 201 });

    } catch (error) {
        console.error('DEBUG: ERROR in POST /api/v1/appointments:', error);
        return NextResponse.json({ message: 'Internal Server Error', error: (error as Error).message }, { status: 500 });
    }
}
