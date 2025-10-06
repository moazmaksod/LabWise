

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getNextOrderId } from '@/lib/counters';
import { decrypt } from '@/lib/auth';
import type { Order, TestCatalogItem, OrderSample, OrderTest, Role, Appointment } from '@/lib/types';

// POST a new order
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
        const { patientId, physicianId, icd10Code, priority, samples, appointmentDetails } = body;

        // Validation
        if (!patientId || !physicianId || !icd10Code || !samples || !Array.isArray(samples) || samples.length === 0) {
            return NextResponse.json({ message: 'Missing or invalid required fields.' }, { status: 400 });
        }

        const { db } = await connectToDatabase();

        // Validate patient and physician exist
        const patient = await db.collection('patients').findOne({ _id: new ObjectId(patientId) });
        if (!patient) return NextResponse.json({ message: 'Patient not found.' }, { status: 404 });
        
        const physician = await db.collection('users').findOne({ _id: new ObjectId(physicianId) });
        if (!physician || physician.role !== 'physician') return NextResponse.json({ message: 'Physician not found.' }, { status: 404 });

        const allTestCodes = samples.flatMap((s: any) => s.testCodes);
        if(allTestCodes.length === 0) {
             return NextResponse.json({ message: 'At least one test must be selected.' }, { status: 400 });
        }
        
        // Fetch all test definitions from the catalog
        const testDefs = await db.collection<TestCatalogItem>('testCatalog').find({ testCode: { $in: allTestCodes } }).toArray();

        if (testDefs.length !== allTestCodes.length) {
            const foundCodes = new Set(testDefs.map(t => t.testCode));
            const missingCodes = allTestCodes.filter((c: string) => !foundCodes.has(c));
            return NextResponse.json({ message: `One or more invalid test codes provided: ${missingCodes.join(', ')}` }, { status: 400 });
        }

        const testDefMap = new Map(testDefs.map(t => [t.testCode, t]));
        
        const orderSamples: OrderSample[] = samples.map((sample: any) => {
            const testsForSample: OrderTest[] = sample.testCodes.map((tc: string) => {
                const testDef = testDefMap.get(tc);
                // --- This is the "Snapshotting" logic ---
                return {
                    testCode: testDef!.testCode,
                    name: testDef!.name,
                    status: 'Pending',
                    // For simplicity, we are taking the first reference range. A real system would have more complex logic.
                    referenceRange: testDef!.referenceRanges?.length > 0 ? `${testDef!.referenceRanges[0].rangeLow} - ${testDef!.referenceRanges[0].rangeHigh}` : 'N/A',
                    resultUnits: testDef!.referenceRanges?.length > 0 ? testDef!.referenceRanges[0].units : '',
                };
            });

            return {
                sampleId: new ObjectId(),
                sampleType: sample.sampleType,
                status: 'AwaitingCollection',
                tests: testsForSample,
            };
        });
        
        const newOrderId = await getNextOrderId();

        const newOrder: Omit<Order, '_id'> = {
            orderId: newOrderId,
            patientId: new ObjectId(patientId),
            physicianId: new ObjectId(physicianId),
            icd10Code,
            priority: priority || 'Routine',
            orderStatus: 'Pending',
            samples: orderSamples,
            createdAt: new Date(),
            createdBy: new ObjectId(userPayload.userId as string),
            updatedAt: new Date(),
        };

        const result = await db.collection('orders').insertOne(newOrder);

        // If appointment details are provided, create an appointment
        if (appointmentDetails) {
            const newAppointment: Omit<Appointment, '_id'> = {
                patientId: new ObjectId(patientId),
                scheduledTime: new Date(appointmentDetails.scheduledTime),
                durationMinutes: appointmentDetails.durationMinutes || 15,
                status: appointmentDetails.status || 'Scheduled',
                notes: appointmentDetails.notes || '',
            };
            await db.collection('appointments').insertOne(newAppointment);
        }

        const createdOrder = { ...newOrder, _id: result.insertedId };
        
        return NextResponse.json({ ...createdOrder, id: result.insertedId.toHexString(), orderId: newOrderId }, { status: 201 });

    } catch (error) {
        console.error('Failed to create order:', error);
        if (error instanceof Error && error.message.includes("Argument passed in must be a single String")) {
             return NextResponse.json({ message: 'Invalid ID format for patient or physician.' }, { status: 400 });
        }
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

// GET orders with search
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const query = searchParams.get('q');
        
        const { db } = await connectToDatabase();

        let aggregationPipeline: any[] = [];
        
        // Always join with patients collection first to enable searching on patient fields
        aggregationPipeline.push({
            $lookup: {
                from: 'patients',
                localField: 'patientId',
                foreignField: '_id',
                as: 'patientInfo'
            }
        });
        
        // Unwind the patientInfo array. Use preserveNullAndEmptyArrays to not drop orders for deleted patients.
        aggregationPipeline.push({ 
            $unwind: {
                path: "$patientInfo",
                preserveNullAndEmptyArrays: true
            }
        });

        // If there's a search query, add a match stage to filter results
        if (query) {
             const searchRegex = new RegExp(query, 'i');
            aggregationPipeline.push({
                $match: {
                    $or: [
                        { orderId: searchRegex },
                        { 'samples.accessionNumber': searchRegex },
                        // Search on joined patient fields
                        { 'patientInfo.mrn': searchRegex },
                        { 'patientInfo.firstName': searchRegex },
                        { 'patientInfo.lastName': searchRegex },
                        { 'patientInfo.contactInfo.phone': searchRegex },
                    ]
                }
            });
        }

        // Add sorting and limiting to the pipeline
        aggregationPipeline.push({ $sort: { createdAt: -1 } });
        aggregationPipeline.push({ $limit: 50 });

        const orders = await db.collection('orders').aggregate(aggregationPipeline).toArray();

        const clientOrders = orders.map(order => {
          const { _id, ...rest } = order;
          const patientInfo = rest.patientInfo ? { ...rest.patientInfo, id: rest.patientInfo._id.toHexString(), _id: undefined } : undefined;
          return { ...rest, id: _id.toHexString(), patientInfo };
        });

        return NextResponse.json(clientOrders, { status: 200 });

    } catch (error) {
        console.error('Failed to fetch orders:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
