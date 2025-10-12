
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId, MongoServerError } from 'mongodb';
import type { Order, TestCatalogItem, OrderSample, OrderTest, Appointment } from '@/lib/types';
import { decrypt } from '@/lib/auth';
import { addMinutes } from 'date-fns';

// GET a single order by ID
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const id = params.id;
        
        if (!ObjectId.isValid(id)) {
            return NextResponse.json({ message: 'Invalid order ID format.' }, { status: 400 });
        }
        
        const { db } = await connectToDatabase();
        const order = await db.collection('orders').findOne({ _id: new ObjectId(id) });

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


// PUT (update) an order - REWRITTEN WITH DEBUGGING
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    console.log('\n--- [PUT /api/v1/orders/[id]] ---');
    try {
        const id = params.id;
        console.log(`[DEBUG] 1. Received request for order ID: ${id}`);

        if (!ObjectId.isValid(id)) {
            console.error('[ERROR] Invalid order ID format.');
            return NextResponse.json({ message: 'Invalid order ID format.' }, { status: 400 });
        }

        // 1. Authentication & Authorization
        const token = req.headers.get('authorization')?.split(' ')[1];
        if (!token) {
            console.error('[ERROR] Authorization token missing.');
            return NextResponse.json({ message: 'Authorization token missing.' }, { status: 401 });
        }
        const userPayload = await decrypt(token);
        if (!userPayload?.userId || userPayload.role !== 'manager') {
            console.error(`[ERROR] Forbidden access attempt by user role: ${userPayload?.role}`);
            return NextResponse.json({ message: 'Forbidden: You do not have permission to update orders.' }, { status: 403 });
        }
        console.log(`[DEBUG] 2. User authenticated as manager (ID: ${userPayload.userId})`);
        
        // 2. Body Validation
        const body = await req.json();
        console.log('[DEBUG] 3. Received request body:', JSON.stringify(body, null, 2));

        const { physicianId, icd10Code, priority, testCodes, appointmentDetails } = body;
        
        if (!physicianId || !icd10Code || !priority || !testCodes || !Array.isArray(testCodes) || testCodes.length === 0 || !appointmentDetails || !appointmentDetails.scheduledTime) {
            console.error('[ERROR] Missing or invalid required fields in request body.');
            return NextResponse.json({ message: 'Missing or invalid required fields for order update.' }, { status: 400 });
        }
        
        const { db } = await connectToDatabase();
        const orderObjectId = new ObjectId(id);

        // 3. Fetch existing order
        const existingOrder = await db.collection<Order>('orders').findOne({ _id: orderObjectId });
        if (!existingOrder) {
            console.error(`[ERROR] Order with ID ${id} not found.`);
            return NextResponse.json({ message: 'Order not found' }, { status: 404 });
        }
        console.log('[DEBUG] 4. Successfully fetched existing order:', JSON.stringify(existingOrder, null, 2));

        // 4. Appointment Logic
        const newApptStartTime = new Date(appointmentDetails.scheduledTime);
        const newApptDuration = parseInt(appointmentDetails.durationMinutes, 10) || 15;
        console.log(`[DEBUG] 5. New appointment time: ${newApptStartTime.toISOString()}, Duration: ${newApptDuration} mins`);
        
        if (existingOrder.appointmentId && ObjectId.isValid(existingOrder.appointmentId)) {
            console.log(`[DEBUG] 5a. Order has a valid appointmentId: ${existingOrder.appointmentId}. Checking for overlaps.`);
            const newApptEndTime = addMinutes(newApptStartTime, newApptDuration);

            const overlapQuery = {
                _id: { $ne: existingOrder.appointmentId }, 
                $or: [
                    { scheduledTime: { $lt: newApptEndTime, $gt: newApptStartTime } },
                    { $expr: { $let: {
                        vars: { endTime: { $add: ["$scheduledTime", { $multiply: [{ $ifNull: [ { $toLong: "$durationMinutes" }, 15 ] }, 60000] }] } },
                        in: { $and: [ { $lte: ["$scheduledTime", newApptStartTime] }, { $gt: [ "$$endTime", newApptStartTime ] } ] }
                    }}},
                ]
            };
            console.log('[DEBUG] 5b. Overlap query:', JSON.stringify(overlapQuery, null, 2));

            const overlappingAppointment = await db.collection('appointments').findOne(overlapQuery);

            if (overlappingAppointment) {
                console.error('[ERROR] Appointment overlap detected with:', JSON.stringify(overlappingAppointment, null, 2));
                return NextResponse.json({ message: 'This time slot is already booked or overlaps with another appointment.' }, { status: 409 });
            }
            console.log('[DEBUG] 5c. No appointment overlap found. Proceeding to update appointment.');
            
            await db.collection<Appointment>('appointments').updateOne(
                { _id: existingOrder.appointmentId },
                { $set: { 
                    scheduledTime: newApptStartTime,
                    durationMinutes: newApptDuration,
                    updatedAt: new Date(),
                 } }
            );
             console.log(`[DEBUG] 5d. Appointment ${existingOrder.appointmentId} updated successfully.`);
        } else {
             console.log('[DEBUG] 5a. Order does not have a valid appointmentId. Skipping appointment overlap check and update.');
        }

        // 5. Rebuild Samples while preserving state
        const testDefs = await db.collection<TestCatalogItem>('testCatalog').find({ testCode: { $in: testCodes } }).toArray();
        if (testDefs.length !== testCodes.length) {
             console.error('[ERROR] One or more invalid test codes provided.');
            return NextResponse.json({ message: 'One or more invalid test codes provided.' }, { status: 400 });
        }
        
        const samplesByTubeType = new Map<string, TestCatalogItem[]>();
        testDefs.forEach(testDef => {
            const tubeType = testDef.specimenRequirements.tubeType;
            if (!samplesByTubeType.has(tubeType)) samplesByTubeType.set(tubeType, []);
            samplesByTubeType.get(tubeType)!.push(testDef);
        });
        console.log('[DEBUG] 6. Tests grouped by sample tube type.');

        const newOrderSamples: OrderSample[] = Array.from(samplesByTubeType.entries()).map(([tubeType, tests]) => {
            const existingSample = existingOrder.samples.find(s => s.sampleType === tubeType);
            
            const newTests: OrderTest[] = tests.map(testDef => ({
                testCode: testDef.testCode,
                name: testDef.name,
                status: 'Pending',
                referenceRange: testDef.referenceRanges?.length > 0 ? `${testDef.referenceRanges[0].rangeLow} - ${testDef.referenceRanges[0].rangeHigh}` : 'N/A',
                resultUnits: testDef.referenceRanges?.length > 0 ? testDef.referenceRanges[0].units : '',
            }));

            return {
                sampleId: existingSample?.sampleId || new ObjectId(),
                sampleType: tubeType,
                status: existingSample?.status || 'AwaitingCollection',
                collectionTimestamp: existingSample?.collectionTimestamp,
                receivedTimestamp: existingSample?.receivedTimestamp,
                accessionNumber: existingSample?.accessionNumber,
                tests: newTests,
            };
        });
        console.log('[DEBUG] 7. New samples array constructed:', JSON.stringify(newOrderSamples, null, 2));
        
        // 6. Final Update Payload for the Order
        const updatePayload = {
            physicianId: new ObjectId(physicianId),
            icd10Code,
            priority,
            samples: newOrderSamples,
            updatedAt: new Date(),
        };
        console.log('[DEBUG] 8. Final update payload for order:', JSON.stringify(updatePayload, null, 2));

        const result = await db.collection('orders').updateOne(
            { _id: orderObjectId },
            { $set: updatePayload }
        );
        console.log(`[DEBUG] 9. Database update result: Matched ${result.matchedCount}, Modified ${result.modifiedCount}`);

        // 7. Audit Log
        await db.collection('auditLogs').insertOne({
            timestamp: new Date(),
            userId: new ObjectId(userPayload.userId as string),
            action: 'ORDER_UPDATE',
            entity: { collectionName: 'orders', documentId: orderObjectId },
            details: { orderId: existingOrder.orderId, message: `Order ${existingOrder.orderId} updated by manager.` },
            ipAddress: req.ip || req.headers.get('x-forwarded-for'),
        });
        console.log('[DEBUG] 10. Audit log created successfully.');

        const updatedOrder = await db.collection('orders').findOne({ _id: orderObjectId });
        const clientResponse = { ...updatedOrder, id: updatedOrder?._id.toHexString() };

        console.log('--- [END PUT /api/v1/orders/[id]] ---');
        return NextResponse.json(clientResponse, { status: 200 });

    } catch (error) {
        console.error('[FATAL] An unexpected error occurred in PUT /api/v1/orders/[id]:', error);
        if (error instanceof MongoServerError) {
            return NextResponse.json({ message: 'A database error occurred during the update.', details: error.message, code: error.codeName }, { status: 500 });
        }
        return NextResponse.json({ message: 'An unexpected internal error occurred.', details: (error as Error).message }, { status: 500 });
    }
}
