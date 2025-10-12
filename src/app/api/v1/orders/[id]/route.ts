
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Order, TestCatalogItem, OrderSample, OrderTest, Appointment } from '@/lib/types';
import { decrypt } from '@/lib/auth';
import { addMinutes } from 'date-fns';

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
    console.log(`[DEBUG] PUT /api/v1/orders/${params.id} - Request received.`);
    try {
        if (!ObjectId.isValid(params.id)) {
            console.log('[DEBUG] Invalid order ID format.');
            return NextResponse.json({ message: 'Invalid order ID format.' }, { status: 400 });
        }

        const token = req.headers.get('authorization')?.split(' ')[1];
        if (!token) return NextResponse.json({ message: 'Authorization token missing.' }, { status: 401 });
        const userPayload = await decrypt(token);
        if (!userPayload?.userId) return NextResponse.json({ message: 'Invalid or expired token.' }, { status: 401 });

        const body = await req.json();
        console.log('[DEBUG] 1. Received body:', JSON.stringify(body, null, 2));
        
        const { physicianId, icd10Code, priority, testCodes, appointmentDetails } = body;
        console.log('[DEBUG] 2. Extracted variables:', { physicianId, icd10Code, priority, testCodes, appointmentDetails });
        
        if (!physicianId || !icd10Code || !priority || !testCodes || !Array.isArray(testCodes) || testCodes.length === 0 || !appointmentDetails || !appointmentDetails.scheduledTime) {
            console.log('[DEBUG] Validation failed: Missing required fields.');
            return NextResponse.json({ message: 'Missing or invalid required fields for order update.', status: 400 });
        }

        const { db } = await connectToDatabase();
        
        const orderObjectId = new ObjectId(params.id);
        const existingOrder = await db.collection<Order>('orders').findOne({ _id: orderObjectId });
        if (!existingOrder) {
            console.log('[DEBUG] Order not found in database.');
            return NextResponse.json({ message: 'Order not found' }, { status: 404 });
        }
        console.log('[DEBUG] 3. Found existing order:', JSON.stringify(existingOrder, null, 2));


        // ---- Check for overlapping appointments ----
        const newApptStartTime = new Date(appointmentDetails.scheduledTime);
        const newApptEndTime = addMinutes(newApptStartTime, appointmentDetails.durationMinutes || 15);
        console.log('[DEBUG] 4. Appointment time window:', { start: newApptStartTime, end: newApptEndTime });

        // ONLY perform the overlap check if the existing order has a valid appointment ID.
        if (existingOrder.appointmentId && ObjectId.isValid(existingOrder.appointmentId)) {
             const overlapQuery = {
                _id: { $ne: existingOrder.appointmentId },
                 $or: [
                    // An existing appointment starts during the new appointment
                    { scheduledTime: { $lt: newApptEndTime, $gte: newApptStartTime } },
                    // An existing appointment ends during the new appointment
                    { 
                        $expr: { 
                            $gt: [ 
                                { $add: ["$scheduledTime", { $multiply: ["$durationMinutes", 60000] }] }, 
                                newApptStartTime 
                            ] 
                        },
                        scheduledTime: { $lt: newApptStartTime }
                    },
                ]
            };
            console.log('[DEBUG] 5. Overlap query:', JSON.stringify(overlapQuery, null, 2));
            const overlappingAppointment = await db.collection('appointments').findOne(overlapQuery);
            console.log('[DEBUG] 6. Overlapping appointment result:', JSON.stringify(overlappingAppointment, null, 2));

            if (overlappingAppointment) {
                console.log('[DEBUG] Overlap found. Returning 409 Conflict.');
                return NextResponse.json({ message: 'This time slot is already booked or overlaps with another appointment.' }, { status: 409 });
            }
        } else {
            console.log('[DEBUG] 5. Skipping overlap check because order has no valid appointmentId.');
        }
        // ---- End overlap check ----

        const testDefs = await db.collection<TestCatalogItem>('testCatalog').find({ testCode: { $in: testCodes } }).toArray();
        if (testDefs.length !== testCodes.length) {
            console.log('[DEBUG] One or more test codes were invalid.');
            return NextResponse.json({ message: 'One or more invalid test codes provided.' }, { status: 400 });
        }
        
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
            
            const existingSample = existingOrder.samples.find(s => s.sampleType === tubeType);
            
            return {
                sampleId: existingSample?.sampleId || new ObjectId(),
                sampleType: tubeType,
                status: existingSample?.status || 'AwaitingCollection',
                collectionTimestamp: existingSample?.collectionTimestamp,
                receivedTimestamp: existingSample?.receivedTimestamp,
                tests: testsForSample,
            };
        });
        
        // Update the associated appointment if it exists
        if (existingOrder.appointmentId && ObjectId.isValid(existingOrder.appointmentId)) {
            console.log('[DEBUG] 7. Updating associated appointment:', existingOrder.appointmentId);
            await db.collection<Appointment>('appointments').updateOne(
                { _id: existingOrder.appointmentId },
                { $set: { 
                    scheduledTime: newApptStartTime,
                    durationMinutes: appointmentDetails.durationMinutes || 15,
                    notes: appointmentDetails.notes || '', // Keep existing notes if new ones aren't provided
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
        console.log('[DEBUG] 8. Final update payload for order:', JSON.stringify(updatePayload, null, 2));

        const result = await db.collection('orders').updateOne(
            { _id: orderObjectId },
            { $set: updatePayload }
        );
        console.log('[DEBUG] 9. MongoDB update result:', JSON.stringify(result, null, 2));

        await db.collection('auditLogs').insertOne({
            timestamp: new Date(),
            userId: new ObjectId(userPayload.userId as string),
            action: 'ORDER_UPDATE',
            entity: { collectionName: 'orders', documentId: orderObjectId },
            details: { orderId: existingOrder.orderId, message: `Order ${existingOrder.orderId} updated.`, changes: updatePayload },
            ipAddress: req.ip || req.headers.get('x-forwarded-for'),
        });

        const updatedOrder = await db.collection('orders').findOne({ _id: orderObjectId });
        const clientResponse = { ...updatedOrder, id: updatedOrder?._id.toHexString() };
        console.log('[DEBUG] 10. Update successful. Returning 200.');

        return NextResponse.json(clientResponse, { status: 200 });
    } catch (error) {
        console.error('[FATAL] Failed to update order:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
