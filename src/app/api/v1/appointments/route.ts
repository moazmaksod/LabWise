

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

        let targetDate: Date;
        if (dateParam && !isNaN(Date.parse(dateParam))) {
            targetDate = new Date(dateParam);
        } else {
            targetDate = new Date();
        }
        
        const dayStart = startOfDay(targetDate);
        const dayEnd = endOfDay(targetDate);

        let filter: any = { scheduledTime: { $gte: dayStart, $lte: dayEnd } };
        
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
                    let: { patient_id: '$patientId' },
                    pipeline: [
                        { $match: { 
                            $expr: { $eq: ['$patientId', '$$patient_id'] },
                            // Only show orders that are still pending and need collection
                            orderStatus: 'Pending',
                            'samples.status': 'AwaitingCollection'
                          }
                        },
                        { $sort: { createdAt: -1 } },
                    ],
                    as: 'pendingOrders'
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
            appt.pendingOrders?.flatMap((order: any) => 
                order.samples.flatMap((sample: any) => 
                    sample.tests.map((test: any) => test.testCode)
                ) || []
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
            const { _id, patientId, patientInfo, pendingOrders, ...rest } = appt;
            
            const clientPatientInfo = patientInfo ? {
              ...patientInfo,
              id: patientInfo._id.toHexString(),
              _id: undefined,
            } : undefined;
            
            const clientPendingOrders = pendingOrders?.map((order: any) => {
                const { _id: orderId, ...restOrder } = order;
                
                const samplesWithDetails = restOrder.samples.map((sample: any) => {
                    const testsWithDetails = sample.tests.map((test: any) => ({
                        ...test,
                        // Add test name back for display purposes, even if snapshotted
                        name: testDefMap.get(test.testCode)?.name || test.name,
                    }));
                    
                    const tubeTypes = [...new Set(sample.tests.map((t: any) => testDefMap.get(t.testCode)?.specimenRequirements.tubeType).filter(Boolean))].join(', ');
                    const specialHandling = [...new Set(sample.tests.map((t: any) => testDefMap.get(t.testCode)?.specimenRequirements.specialHandling).filter(Boolean))].join(', ');

                    return {
                        ...sample,
                        sampleId: sample.sampleId.toHexString(),
                        tests: testsWithDetails,
                        specimenSummary: {
                            tubeType: tubeTypes,
                            specialHandling: specialHandling,
                        }
                    }
                });

                return {
                    ...restOrder,
                    id: orderId.toHexString(),
                    samples: samplesWithDetails
                };
            });

            return { 
                ...rest, 
                id: _id.toHexString(),
                patientId: patientId?.toHexString(),
                patientInfo: clientPatientInfo,
                pendingOrders: clientPendingOrders
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
            notes: notes || '',
        };
        console.log('DEBUG: New appointment document:', newAppointment);

        const result = await db.collection('appointments').insertOne(newAppointment);
        console.log('DEBUG: Insert result:', result);

        if (!result.insertedId) {
            console.log('DEBUG: MongoDB insert operation failed.');
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
