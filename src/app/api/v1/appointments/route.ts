
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { startOfDay, endOfDay } from 'date-fns';

// GET appointments (filtered by date range)
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const dateStr = searchParams.get('date'); // YYYY-MM-DD
        const start = searchParams.get('start');
        const end = searchParams.get('end');

        const { db } = await connectToDatabase();
        
        let filter: any = {};

        if (dateStr) {
            const targetDate = new Date(dateStr + 'T00:00:00');
            filter.scheduledTime = {
                $gte: startOfDay(targetDate),
                $lte: endOfDay(targetDate),
            };
        } else if (start && end) {
            filter.scheduledTime = {
                $gte: new Date(start),
                $lte: new Date(end),
            };
        } else {
            // Default to today if no params
            const today = new Date();
            filter.scheduledTime = {
                $gte: startOfDay(today),
                $lte: endOfDay(today),
            };
        }

        const appointments = await db.collection('appointments').aggregate([
            { $match: filter },
            {
                $lookup: {
                    from: 'patients',
                    localField: 'patientId',
                    foreignField: '_id',
                    as: 'patientInfo'
                }
            },
            { $unwind: '$patientInfo' },
            { $sort: { scheduledTime: 1 } }
        ]).toArray();
        
        const clientAppointments = appointments.map(appt => ({
            id: appt._id.toHexString(),
            patientId: appt.patientId.toHexString(),
            orderId: appt.orderId?.toHexString(),
            appointmentType: appt.appointmentType,
            scheduledTime: appt.scheduledTime,
            durationMinutes: appt.durationMinutes,
            status: appt.status,
            notes: appt.notes,
            patientInfo: {
                firstName: appt.patientInfo.firstName,
                lastName: appt.patientInfo.lastName,
                mrn: appt.patientInfo.mrn,
            }
        }));

        return NextResponse.json(clientAppointments);
    } catch (error) {
        console.error('Failed to fetch appointments:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

// POST /appointments is handled via POST /orders mostly, but we can add a standalone if needed later.
// PUT /appointments/{id} would be for rescheduling. Let's add that here.

export async function PUT(req: NextRequest) {
     try {
        const body = await req.json();
        const { id, scheduledTime, status } = body;

        if (!id) return NextResponse.json({ message: 'ID required' }, { status: 400 });

        const { db } = await connectToDatabase();
        
        const updateData: any = { updatedAt: new Date() };
        if (scheduledTime) updateData.scheduledTime = new Date(scheduledTime);
        if (status) updateData.status = status;

        const result = await db.collection('appointments').updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );

        if (result.matchedCount === 0) return NextResponse.json({ message: 'Not found' }, { status: 404 });

        return NextResponse.json({ message: 'Updated successfully' });

     } catch (error) {
        console.error('Failed to update appointment:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
     }
}
