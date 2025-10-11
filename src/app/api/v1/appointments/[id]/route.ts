
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { decrypt } from '@/lib/auth';
import type { Appointment, TestCatalogItem, OrderSample } from '@/lib/types';


export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        if (!ObjectId.isValid(params.id)) {
            return NextResponse.json({ message: 'Invalid appointment ID format.' }, { status: 400 });
        }

        const { db } = await connectToDatabase();
        
        const aggregationPipeline: any[] = [
            { $match: { _id: new ObjectId(params.id) } },
            {
                $lookup: {
                    from: 'patients',
                    localField: 'patientId',
                    foreignField: '_id',
                    as: 'patientInfo'
                }
            },
            { $unwind: { path: '$patientInfo', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'orders',
                    localField: 'orderId',
                    foreignField: '_id',
                    as: 'orderInfo'
                }
            },
            { $unwind: { path: '$orderInfo', preserveNullAndEmptyArrays: true } },
        ];

        const appointment = await db.collection('appointments').aggregate(aggregationPipeline).next();

        if (!appointment) {
            return NextResponse.json({ message: 'Appointment not found.' }, { status: 404 });
        }
        
        // Fetch test details for the order if it exists and has samples
        if (appointment.orderInfo && appointment.orderInfo.samples) {
            const allTestCodes = appointment.orderInfo.samples.flatMap((sample: any) => 
                sample.tests.map((test: any) => test.testCode)
            );
            const uniqueTestCodes = [...new Set(allTestCodes)];
            
            const testDefs = await db.collection<TestCatalogItem>('testCatalog').find(
                { testCode: { $in: uniqueTestCodes } },
                { projection: { testCode: 1, name: 1, specimenRequirements: 1 } }
            ).toArray();
            const testDefMap = new Map(testDefs.map(t => [t.testCode, t]));
            
            const samplesWithDetails = appointment.orderInfo.samples.map((sample: OrderSample) => {
                const testsWithDetails = sample.tests.map((test) => ({
                    ...test,
                    name: testDefMap.get(test.testCode)?.name || test.name,
                }));

                const firstTestDef = testsWithDetails.length > 0 ? testDefMap.get(testsWithDetails[0].testCode) : undefined;
                
                return {
                    ...sample,
                    sampleId: sample.sampleId.toHexString(),
                    tests: testsWithDetails,
                    specimenRequirements: firstTestDef?.specimenRequirements,
                };
            });

            appointment.orderInfo.samples = samplesWithDetails;
            appointment.orderInfo.id = appointment.orderInfo._id.toHexString();
            delete appointment.orderInfo._id;
        }

        const { _id, patientId, orderId, patientInfo, ...rest } = appointment;
        
        const clientAppointment = {
            ...rest,
            id: _id.toHexString(),
            patientId: patientId?.toHexString(),
            orderId: orderId?.toHexString(),
            patientInfo: patientInfo ? { ...patientInfo, id: patientInfo._id.toHexString(), _id: undefined } : undefined,
        };

        return NextResponse.json(clientAppointment, { status: 200 });

    } catch (error) {
        console.error('Failed to fetch appointment:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}


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
        
        const localDate = new Date(scheduledTime);

        const updatePayload = {
            patientId: new ObjectId(patientId),
            scheduledTime: localDate,
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
