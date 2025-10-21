

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId, MongoServerError } from 'mongodb';
import type { Order, TestCatalogItem, OrderSample, OrderTest, Appointment, User } from '@/lib/types';
import { decrypt } from '@/lib/auth';
import { addMinutes } from 'date-fns';

// GET a single order by ID
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const id = params.id;
    try {
        if (!ObjectId.isValid(id)) {
            return NextResponse.json({ message: 'Invalid order ID format.' }, { status: 400 });
        }
        
        const { db } = await connectToDatabase();

        // Sprint 14 Enhancement: Join with patient data for patient portal
        const aggregationPipeline: any[] = [
            { $match: { _id: new ObjectId(id) } },
            {
                $lookup: {
                    from: 'patients',
                    localField: 'patientId',
                    foreignField: '_id',
                    as: 'patientInfo'
                }
            },
            { $unwind: { path: '$patientInfo', preserveNullAndEmptyArrays: true } },
        ];
        
        const order = await db.collection('orders').aggregate(aggregationPipeline).next();

        if (!order) {
            return NextResponse.json({ message: 'Order not found.' }, { status: 404 });
        }
        
        const { _id, patientInfo, ...restOfOrder } = order;
        const clientOrder = { 
            ...restOfOrder, 
            id: _id.toHexString(), 
            appointmentId: order.appointmentId?.toHexString(),
            patientInfo: patientInfo ? { ...patientInfo, id: patientInfo._id.toHexString(), _id: undefined } : undefined,
            samples: order.samples.map((s: any) => ({ ...s, sampleId: s.sampleId.toHexString() }))
        };

        return NextResponse.json(clientOrder);
    } catch (error) {
        console.error(`Failed to fetch order ${params.id}:`, error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

// PUT (update) an order
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const id = params.id;

        if (!ObjectId.isValid(id)) {
            return NextResponse.json({ message: 'Invalid order ID format.' }, { status: 400 });
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

        const { physicianId, icd10Code, priority, testIds, appointmentDetails, appointmentId } = body;
        
        if (!physicianId || !icd10Code || !priority || !testIds || !Array.isArray(testIds) || !appointmentDetails || !appointmentDetails.scheduledTime) {
            return NextResponse.json({ message: 'Missing or invalid required fields for order update.' }, { status: 400 });
        }
        
        const { db } = await connectToDatabase();
        const orderObjectId = new ObjectId(id);

        const existingOrder = await db.collection<Order>('orders').findOne({ _id: orderObjectId });
        if (!existingOrder) {
            return NextResponse.json({ message: 'Order not found' }, { status: 404 });
        }
        
        // --- Permission Checks ---
        if (userPayload.role === 'physician' && existingOrder.createdBy.toHexString() !== userPayload.userId) {
             return NextResponse.json({ message: 'Forbidden: You can only modify orders that you created.' }, { status: 403 });
        }
        if (userPayload.role === 'receptionist' && !['Pending', 'Partially Collected'].includes(existingOrder.orderStatus)) {
            return NextResponse.json({ message: 'Forbidden: Receptionists can only edit orders before collection is complete.' }, { status: 403 });
        }
        // --- End Permission Checks ---

        const newApptStartTime = new Date(appointmentDetails.scheduledTime);
        const newApptDuration = parseInt(appointmentDetails.durationMinutes, 10) || 15;
        
        if (appointmentId && ObjectId.isValid(appointmentId)) {
            const newApptEndTime = addMinutes(newApptStartTime, newApptDuration);

            const overlapQuery = {
                _id: { $ne: new ObjectId(appointmentId) },
                 scheduledTime: { $lt: newApptEndTime, $gt: addMinutes(newApptStartTime, -newApptDuration) } // Simplified check
            };

            const overlappingAppointment = await db.collection('appointments').findOne(overlapQuery);

            if (overlappingAppointment) {
                return NextResponse.json({ message: 'This time slot is already booked or overlaps with another appointment.' }, { status: 409 });
            }
            
            await db.collection<Appointment>('appointments').updateOne(
                { _id: new ObjectId(appointmentId) },
                { $set: { 
                    scheduledTime: newApptStartTime,
                    durationMinutes: newApptDuration,
                    updatedAt: new Date(),
                 } }
            );
        }
        
        const updatePayload: { $set: Partial<Order> } = { $set: {} };
        let hasChanges = false;

        if (existingOrder.physicianId.toHexString() !== physicianId) {
            updatePayload.$set.physicianId = new ObjectId(physicianId);
            hasChanges = true;
        }
        if (existingOrder.icd10Code !== icd10Code) {
            updatePayload.$set.icd10Code = icd10Code;
            hasChanges = true;
        }
        if (existingOrder.priority !== priority) {
            updatePayload.$set.priority = priority;
            hasChanges = true;
        }

        const existingTestCodes = new Set(existingOrder.samples.flatMap(s => s.tests.map(t => t.testCode)));
        const newTestCodes = new Set(testIds);

        const testsChanged = existingTestCodes.size !== newTestCodes.size || ![...existingTestCodes].every(code => newTestCodes.has(code));
        
        if (testsChanged) {
            hasChanges = true;
            
            const testDefs = await db.collection<TestCatalogItem>('testCatalog').find({ testCode: { $in: testIds } }).toArray();
            if (testDefs.length !== testIds.length) {
                return NextResponse.json({ message: 'One or more invalid test codes provided.' }, { status: 400 });
            }
            
            const samplesByTubeType = new Map<string, OrderTest[]>();
            for (const testDef of testDefs) {
                const tubeType = testDef.specimenRequirements.tubeType;
                if (!samplesByTubeType.has(tubeType)) {
                    samplesByTubeType.set(tubeType, []);
                }
                samplesByTubeType.get(tubeType)!.push({
                    testCode: testDef.testCode,
                    name: testDef.name,
                    status: 'Pending',
                    referenceRange: testDef.referenceRanges?.length > 0 ? `${testDef.referenceRanges[0].rangeLow} - ${testDef.referenceRanges[0].rangeHigh}` : 'N/A',
                    resultUnits: testDef.referenceRanges?.length > 0 ? testDef.referenceRanges[0].units : '',
                });
            }

            updatePayload.$set.samples = Array.from(samplesByTubeType.entries()).map(([tubeType, tests]) => ({
                sampleId: new ObjectId(),
                sampleType: tubeType,
                status: 'AwaitingCollection',
                tests: tests,
            }));
        }
        
        if (!hasChanges) {
             const clientResponse = { ...existingOrder, id: existingOrder._id.toHexString() };
             return NextResponse.json(clientResponse, { status: 200 });
        }
        
        updatePayload.$set.updatedAt = new Date();
        
        await db.collection('orders').updateOne(
            { _id: orderObjectId },
            updatePayload
        );

        await db.collection('auditLogs').insertOne({
            timestamp: new Date(),
            userId: new ObjectId(userPayload.userId as string),
            action: 'ORDER_UPDATE',
            entity: { collectionName: 'orders', documentId: orderObjectId },
            details: { orderId: existingOrder.orderId, message: `Order ${existingOrder.orderId} updated by ${userPayload.role}.`, changes: updatePayload.$set },
            ipAddress: req.ip || req.headers.get('x-forwarded-for'),
        });

        const updatedOrder = await db.collection('orders').findOne({ _id: orderObjectId });
        const clientResponse = { ...updatedOrder, id: updatedOrder?._id.toHexString() };

        return NextResponse.json(clientResponse, { status: 200 });

    } catch (error) {
        console.error('[FATAL] An unexpected error occurred in PUT /api/v1/orders/[id]:', error);
        if (error instanceof MongoServerError) {
            return NextResponse.json({ message: 'A database error occurred during the update.', details: error.message, code: error.codeName }, { status: 500 });
        }
        return NextResponse.json({ message: 'An unexpected internal error occurred.', details: (error as Error).message }, { status: 500 });
    }
}
    