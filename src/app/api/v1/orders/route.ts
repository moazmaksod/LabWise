
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getNextOrderId } from '@/lib/counters';
import { decrypt } from '@/lib/auth';
import type { Order, TestCatalogItem, OrderSample, OrderTest } from '@/lib/types';

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
        const { patientId, physicianId, icd10Code, priority, tests } = body;

        // Validation
        if (!patientId || !physicianId || !icd10Code || !tests || tests.length === 0) {
            return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
        }

        const { db } = await connectToDatabase();

        // Validate patient and physician exist
        const patient = await db.collection('patients').findOne({ _id: new ObjectId(patientId) });
        if (!patient) return NextResponse.json({ message: 'Patient not found.' }, { status: 404 });
        
        const physician = await db.collection('users').findOne({ _id: new ObjectId(physicianId) });
        if (!physician || physician.role !== 'physician') return NextResponse.json({ message: 'Physician not found.' }, { status: 404 });

        // Fetch all test definitions from the catalog
        const testDefs = await db.collection<TestCatalogItem>('testCatalog').find({ testCode: { $in: tests } }).toArray();

        if (testDefs.length !== tests.length) {
            return NextResponse.json({ message: 'One or more invalid test codes provided.' }, { status: 400 });
        }
        
        // Group tests by required sample type to create samples
        const samplesMap = new Map<string, OrderTest[]>();

        for (const testDef of testDefs) {
            const sampleType = testDef.specimenRequirements.tubeType;
            if (!samplesMap.has(sampleType)) {
                samplesMap.set(sampleType, []);
            }
            
            // --- This is the "Snapshotting" logic ---
            const orderTest: OrderTest = {
                testCode: testDef.testCode,
                name: testDef.name,
                status: 'Pending',
                // For simplicity, we are taking the first reference range. A real system would have more complex logic.
                referenceRange: testDef.referenceRanges.length > 0 ? `${testDef.referenceRanges[0].rangeLow} - ${testDef.referenceRanges[0].rangeHigh}` : 'N/A',
                resultUnits: testDef.referenceRanges.length > 0 ? testDef.referenceRanges[0].units : '',
            };
            samplesMap.get(sampleType)!.push(orderTest);
        }
        
        const orderSamples: OrderSample[] = Array.from(samplesMap.entries()).map(([sampleType, tests]) => ({
            sampleId: new ObjectId(),
            sampleType: sampleType,
            status: 'AwaitingCollection',
            tests: tests,
        }));
        
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

        return NextResponse.json({ ...newOrder, id: result.insertedId }, { status: 201 });

    } catch (error) {
        console.error('Failed to create order:', error);
        if (error instanceof Error && error.message.includes("Argument passed in must be a single String")) {
             return NextResponse.json({ message: 'Invalid ID format for patient or physician.' }, { status: 400 });
        }
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

// GET orders (will be enhanced later for different roles)
export async function GET(req: NextRequest) {
     try {
        const { db } = await connectToDatabase();
        const orders = await db.collection('orders').find({}).sort({ createdAt: -1 }).limit(50).toArray();

        return NextResponse.json(orders);
    } catch (error) {
        console.error('Failed to fetch orders:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
