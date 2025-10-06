

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { decrypt } from '@/lib/auth';
import type { Appointment, TestCatalogItem } from '@/lib/types';
import { format, startOfDay, endOfDay } from 'date-fns';

export async function GET(req: NextRequest) {
    try {
        const { db } = await connectToDatabase();
        const { searchParams } = new URL(req.url);
        const dateParam = searchParams.get('date');
        const query = searchParams.get('q');
        const type = searchParams.get('type') as Appointment['appointmentType'] | null;

        let targetDate: Date;
        if (dateParam && !isNaN(Date.parse(dateParam))) {
            const localDate = new Date(dateParam + 'T00:00:00');
            targetDate = localDate;
        } else {
            targetDate = new Date();
        }
        
        const dayStart = startOfDay(targetDate);
        const dayEnd = endOfDay(targetDate);

        let filter: any = { scheduledTime: { $gte: dayStart, $lte: dayEnd } };
        
        if (type) {
            filter.appointmentType = type;
        }

        const aggregationPipeline: any[] = [
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
                $lookup: {
                    from: 'orders',
                    localField: 'orderId',
                    foreignField: '_id',
                    as: 'orderInfo'
                }
            },
             {
                $unwind: {
                    path: '$orderInfo',
                    preserveNullAndEmptyArrays: true
                }
            },
        ];

        if (query) {
            const searchRegex = new RegExp(query, 'i');
            aggregationPipeline.push({
                $match: {
                    $or: [
                        { 'patientInfo.firstName': searchRegex },
                        { 'patientInfo.lastName': searchRegex },
                        { 'patientInfo.mrn': searchRegex },
                        { 'notes': searchRegex },
                    ]
                }
            });
        }
        
        aggregationPipeline.push({ $limit: 50 });
        
        const appointments = await db.collection('appointments').aggregate(aggregationPipeline).toArray();

        // Fetch all unique test codes from all pending orders
        const allTestCodes = appointments.flatMap(appt => 
            appt.orderInfo?.samples.flatMap((sample: any) => 
                sample.tests.map((test: any) => test.testCode)
            ) || []
        );
        const uniqueTestCodes = [...new Set(allTestCodes)];

        // Fetch specimen requirements for all needed tests in one query
        const testDefs = await db.collection<TestCatalogItem>('testCatalog').find(
            { testCode: { $in: uniqueTestCodes } },
            { projection: { testCode: 1, name: 1, specimenRequirements: 1 } }
        ).toArray();
        const testDefMap = new Map(testDefs.map(t => [t.testCode, t]));


        const clientAppointments = appointments.map(appt => {
            const { _id, patientId, orderId, patientInfo, orderInfo, ...rest } = appt;
            
            const clientPatientInfo = patientInfo ? {
              ...patientInfo,
              id: patientInfo._id.toHexString(),
              _id: undefined,
            } : undefined;
            
            let clientOrderInfo;
            if (orderInfo) {
                const { _id: orderInfoId, ...restOrder } = orderInfo;
                 const samplesWithDetails = orderInfo.samples.map((sample: any) => {
                    const testsWithDetails = sample.tests.map((test: any) => {
                        const testDef = testDefMap.get(test.testCode);
                        return {
                            ...test,
                            name: testDef?.name || test.name,
                            specimenRequirements: testDef?.specimenRequirements,
                        }
                    });

                    // Get requirements from the first test, assuming all tests in a sample have the same reqs
                    const firstTestDef = testsWithDetails.length > 0 ? testDefMap.get(testsWithDetails[0].testCode) : undefined;

                    return {
                        ...sample,
                        sampleId: sample.sampleId.toHexString(),
                        tests: testsWithDetails,
                        specimenSummary: {
                            tubeType: firstTestDef?.specimenRequirements?.tubeType,
                            specialHandling: firstTestDef?.specimenRequirements?.specialHandling,
                        }
                    }
                });

                clientOrderInfo = {
                    ...restOrder,
                    id: orderInfoId.toHexString(),
                    samples: samplesWithDetails
                };
            }
           

            return { 
                ...rest, 
                id: _id.toHexString(),
                patientId: patientId?.toHexString(),
                orderId: orderId?.toHexString(),
                patientInfo: clientPatientInfo,
                orderInfo: clientOrderInfo
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

        const { patientId, scheduledTime, durationMinutes, status, notes, appointmentType } = body;

        if (!patientId || !scheduledTime || !status || !appointmentType) {
            return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
        }
        
        if (!ObjectId.isValid(patientId)) {
            return NextResponse.json({ message: 'Invalid patient ID format.' }, { status: 400 });
        }

        const { db } = await connectToDatabase();

        const newAppointment: Omit<Appointment, '_id'> = {
            patientId: new ObjectId(patientId),
            appointmentType,
            scheduledTime: new Date(scheduledTime),
            durationMinutes: durationMinutes || 15,
            status: status,
            notes: notes || '',
        };

        const result = await db.collection('appointments').insertOne(newAppointment);
        
        if (!result.insertedId) {
            throw new Error('MongoDB insert operation failed.');
        }
        
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
            return NextResponse.json({ message: 'Failed to retrieve created appointment.' }, { status: 500 });
        }
        
        const { _id, ...rest } = createdAppointment;
        const patientInfo = rest.patientInfo ? { ...rest.patientInfo, id: rest.patientInfo._id.toHexString(), _id: undefined } : undefined;
        
        const clientResponse = {
            ...rest,
            id: _id.toHexString(),
            patientInfo
        };

        return NextResponse.json(clientResponse, { status: 201 });

    } catch (error) {
        console.error('ERROR in POST /api/v1/appointments:', error);
        return NextResponse.json({ message: 'Internal Server Error', error: (error as Error).message }, { status: 500 });
    }
}
