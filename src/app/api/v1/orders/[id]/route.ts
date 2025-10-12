
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
        const id = params.id;
        
        if (!ObjectId.isValid(id)) {
            return NextResponse.json({ message: 'Invalid order ID format.' }, { status: 400 });
        }

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


// PUT (update) an order - REWRITTEN
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const id = params.id;
        if (!ObjectId.isValid(id)) {
            return NextResponse.json({ message: 'Invalid order ID format.' }, { status: 400 });
        }

        // 1. Authentication & Authorization
        const token = req.headers.get('authorization')?.split(' ')[1];
        if (!token) return NextResponse.json({ message: 'Authorization token missing.' }, { status: 401 });
        const userPayload = await decrypt(token);
        if (!userPayload?.userId || userPayload.role !== 'manager') {
            return NextResponse.json({ message: 'Forbidden: You do not have permission to update orders.' }, { status: 403 });
        }
        
        // 2. Body Validation
        const body = await req.json();
        const { physicianId, icd10Code, priority, testCodes, appointmentDetails } = body;
        
        if (!physicianId || !icd10Code || !priority || !testCodes || !Array.isArray(testCodes) || testCodes.length === 0 || !appointmentDetails || !appointmentDetails.scheduledTime) {
            return NextResponse.json({ message: 'Missing or invalid required fields for order update.', status: 400 });
        }
        
        const { db } = await connectToDatabase();
        const orderObjectId = new ObjectId(id);

        // 3. Fetch existing order
        const existingOrder = await db.collection<Order>('orders').findOne({ _id: orderObjectId });
        if (!existingOrder) {
            return NextResponse.json({ message: 'Order not found' }, { status: 404 });
        }

        // 4. Appointment Logic
        const newApptStartTime = new Date(appointmentDetails.scheduledTime);
        const newApptDuration = parseInt(appointmentDetails.durationMinutes, 10) || 15;
        const newApptEndTime = addMinutes(newApptStartTime, newApptDuration);

        if (existingOrder.appointmentId && ObjectId.isValid(existingOrder.appointmentId)) {
            const overlapQuery = {
                // IMPORTANT: Exclude the current order's own appointment from the check
                _id: { $ne: existingOrder.appointmentId }, 
                $or: [
                    { scheduledTime: { $lt: newApptEndTime, $gt: newApptStartTime } },
                    { $expr: { $let: {
                        vars: { endTime: { $add: ["$scheduledTime", { $multiply: [{ $ifNull: [ { $toLong: "$durationMinutes" }, 15 ] }, 60000] }] } },
                        in: { $and: [ { $lte: ["$scheduledTime", newApptStartTime] }, { $gt: [ "$$endTime", newApptStartTime ] } ] }
                    }}},
                ]
            };
            const overlappingAppointment = await db.collection('appointments').findOne(overlapQuery);

            if (overlappingAppointment) {
                return NextResponse.json({ message: 'This time slot is already booked or overlaps with another appointment.' }, { status: 409 });
            }
            
            // Update the associated appointment
            await db.collection<Appointment>('appointments').updateOne(
                { _id: existingOrder.appointmentId },
                { $set: { 
                    scheduledTime: newApptStartTime,
                    durationMinutes: newApptDuration,
                    notes: appointmentDetails.notes || existingOrder.notes || '',
                    updatedAt: new Date(),
                 } }
            );
        }

        // 5. Rebuild Samples while preserving state
        const testDefs = await db.collection<TestCatalogItem>('testCatalog').find({ testCode: { $in: testCodes } }).toArray();
        if (testDefs.length !== testCodes.length) {
            return NextResponse.json({ message: 'One or more invalid test codes provided.' }, { status: 400 });
        }
        
        const samplesByTubeType = new Map<string, TestCatalogItem[]>();
        testDefs.forEach(testDef => {
            const tubeType = testDef.specimenRequirements.tubeType;
            if (!samplesByTubeType.has(tubeType)) {
                samplesByTubeType.set(tubeType, []);
            }
            samplesByTubeType.get(tubeType)!.push(testDef);
        });

        const newOrderSamples: OrderSample[] = Array.from(samplesByTubeType.entries()).map(([tubeType, tests]) => {
            const existingSample = existingOrder.samples.find(s => s.sampleType === tubeType);
            
            const newTests: OrderTest[] = tests.map(testDef => ({
                testCode: testDef.testCode,
                name: testDef.name,
                status: 'Pending', // New tests are always pending
                referenceRange: testDef.referenceRanges?.length > 0 ? `${testDef.referenceRanges[0].rangeLow} - ${testDef.referenceRanges[0].rangeHigh}` : 'N/A',
                resultUnits: testDef.referenceRanges?.length > 0 ? testDef.referenceRanges[0].units : '',
            }));

            return {
                sampleId: existingSample?.sampleId || new ObjectId(),
                sampleType: tubeType,
                // Preserve state if sample already existed
                status: existingSample?.status || 'AwaitingCollection',
                collectionTimestamp: existingSample?.collectionTimestamp,
                receivedTimestamp: existingSample?.receivedTimestamp,
                accessionNumber: existingSample?.accessionNumber,
                tests: newTests,
            };
        });
        
        // 6. Final Update Payload for the Order
        const updatePayload = {
            physicianId: new ObjectId(physicianId),
            icd10Code,
            priority,
            samples: newOrderSamples,
            updatedAt: new Date(),
        };

        const result = await db.collection('orders').updateOne(
            { _id: orderObjectId },
            { $set: updatePayload }
        );

        // 7. Audit Log
        await db.collection('auditLogs').insertOne({
            timestamp: new Date(),
            userId: new ObjectId(userPayload.userId as string),
            action: 'ORDER_UPDATE',
            entity: { collectionName: 'orders', documentId: orderObjectId },
            details: { orderId: existingOrder.orderId, message: `Order ${existingOrder.orderId} updated by manager.` },
            ipAddress: req.ip || req.headers.get('x-forwarded-for'),
        });

        const updatedOrder = await db.collection('orders').findOne({ _id: orderObjectId });
        const clientResponse = { ...updatedOrder, id: updatedOrder?._id.toHexString() };

        return NextResponse.json(clientResponse, { status: 200 });
    } catch (error) {
        console.error('[FATAL] Failed to update order:', error);
        return NextResponse.json({ message: 'Internal Server Error', error: (error as Error).message }, { status: 500 });
    }
}
    
