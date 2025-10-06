

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Order, TestCatalogItem, OrderSample, OrderTest, Appointment } from '@/lib/types';
import { decrypt } from '@/lib/auth';

// GET a single order by ID
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { db } = await connectToDatabase();
        
        if (!ObjectId.isValid(params.id)) {
            return NextResponse.json({ message: 'Invalid order ID format.' }, { status: 400 });
        }

        const order = await db.collection('orders').findOne({ _id: new ObjectId(params.id) });

        if (!order) {
            return NextResponse.json({ message: 'Order not found.' }, { status: 404 });
        }
        
        const { _id, ...clientOrder } = order;
        const result = { ...clientOrder, id: _id.toHexString() };

        return NextResponse.json(result);
    } catch (error) {
        console.error(`Failed to fetch order ${params.id}:`, error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}


// PUT (update) an order
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        if (!ObjectId.isValid(params.id)) {
            return NextResponse.json({ message: 'Invalid order ID format.' }, { status: 400 });
        }

        const token = req.headers.get('authorization')?.split(' ')[1];
        if (!token) return NextResponse.json({ message: 'Authorization token missing.' }, { status: 401 });
        const userPayload = await decrypt(token);
        if (!userPayload?.userId) return NextResponse.json({ message: 'Invalid or expired token.' }, { status: 401 });

        const body = await req.json();
        const { patientId, physicianId, icd10Code, priority, testCodes, appointmentDetails } = body;
        
        // Validation
        if (!patientId || !physicianId || !icd10Code || !testCodes || !Array.isArray(testCodes) || testCodes.length === 0 || !appointmentDetails) {
            return NextResponse.json({ message: 'Missing or invalid required fields.' }, { status: 400 });
        }

        const { db } = await connectToDatabase();

        if(testCodes.length === 0) {
             return NextResponse.json({ message: 'At least one test must be selected.' }, { status: 400 });
        }

        // Fetch all test definitions from the catalog
        const testDefs = await db.collection<TestCatalogItem>('testCatalog').find({ testCode: { $in: testCodes } }).toArray();
        if (testDefs.length !== testCodes.length) {
            return NextResponse.json({ message: 'One or more invalid test codes provided.' }, { status: 400 });
        }
        
        // Group tests by required sample type (tube type)
        const samplesByTubeType = new Map<string, TestCatalogItem[]>();
        for (const testDef of testDefs) {
            const tubeType = testDef.specimenRequirements.tubeType;
            if (!samplesByTubeType.has(tubeType)) {
                samplesByTubeType.set(tubeType, []);
            }
            samplesByTubeType.get(tubeType)!.push(testDef);
        }

        const orderSamples: OrderSample[] = Array.from(samplesByTubeType.entries()).map(([tubeType, tests]) => {
            const testsForSample: OrderTest[] = tests.map((testDef) => ({
                testCode: testDef.testCode,
                name: testDef.name,
                status: 'Pending',
                referenceRange: testDef.referenceRanges?.length > 0 ? `${testDef.referenceRanges[0].rangeLow} - ${testDef.referenceRanges[0].rangeHigh}` : 'N/A',
                resultUnits: testDef.referenceRanges?.length > 0 ? testDef.referenceRanges[0].units : '',
            }));
            
            return {
                sampleId: new ObjectId(),
                sampleType: tubeType,
                status: 'AwaitingCollection',
                tests: testsForSample,
            };
        });

        // Find existing order to get appointmentId
        const existingOrder = await db.collection<Order>('orders').findOne({ _id: new ObjectId(params.id) });
        if (!existingOrder) {
            return NextResponse.json({ message: 'Order not found' }, { status: 404 });
        }
        
        // Update the associated appointment
        if (existingOrder.appointmentId) {
            await db.collection<Appointment>('appointments').updateOne(
                { _id: existingOrder.appointmentId },
                { $set: { 
                    scheduledTime: new Date(appointmentDetails.scheduledTime),
                    notes: appointmentDetails.notes,
                    updatedAt: new Date(),
                 } }
            );
        }

        const updatePayload = {
            physicianId: new ObjectId(physicianId),
            icd10Code,
            priority,
            samples: orderSamples,
            updatedAt: new Date(),
        };

        const result = await db.collection('orders').updateOne(
            { _id: new ObjectId(params.id) },
            { $set: updatePayload }
        );


        const updatedOrder = await db.collection('orders').findOne({ _id: new ObjectId(params.id) });

        return NextResponse.json(updatedOrder, { status: 200 });
    } catch (error) {
        console.error('Failed to update order:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

    