

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getNextOrderId } from '@/lib/counters';
import { decrypt } from '@/lib/auth';
import type { Order, TestCatalogItem, OrderSample, OrderTest, Role, Appointment, User } from '@/lib/types';
import { addMinutes, startOfDay, endOfDay } from 'date-fns';

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
        const { patientId, physicianId, icd10Code, priority, testCodes, appointmentDetails } = body;

        // Validation
        if (!patientId || !physicianId || !icd10Code || !testCodes || !Array.isArray(testCodes) || testCodes.length === 0 || !appointmentDetails) {
            return NextResponse.json({ message: 'Missing or invalid required fields. Order must have an appointment.' }, { status: 400 });
        }

        const { db } = await connectToDatabase();

        // Validate patient and physician exist
        const patient = await db.collection('patients').findOne({ _id: new ObjectId(patientId) });
        if (!patient) return NextResponse.json({ message: 'Patient not found.' }, { status: 404 });
        
        const physician = await db.collection('users').findOne({ _id: new ObjectId(physicianId) });
        if (!physician || physician.role !== 'physician') return NextResponse.json({ message: 'Physician not found.' }, { status: 404 });

        if(testCodes.length === 0) {
             return NextResponse.json({ message: 'At least one test must be selected.' }, { status: 400 });
        }

        // ---- Check for overlapping appointments ----
        const newApptStartTime = new Date(appointmentDetails.scheduledTime);
        const newApptEndTime = addMinutes(newApptStartTime, appointmentDetails.durationMinutes || 15);

        const overlappingAppointment = await db.collection('appointments').findOne({
            $or: [
                // New appointment starts during an existing one
                { scheduledTime: { $lt: newApptEndTime }, $expr: { $gt: [ { $add: ["$scheduledTime", { $multiply: ["$durationMinutes", 60000] }] }, newApptStartTime ] } },
                // New appointment ends during an existing one
                { scheduledTime: { $lt: newApptStartTime }, $expr: { $gt: [ { $add: ["$scheduledTime", { $multiply: ["$durationMinutes", 60000] }] }, newApptStartTime ] } },
                // New appointment envelops an existing one
                { scheduledTime: { $gte: newApptStartTime, $lt: newApptEndTime } }
            ]
        });

        if (overlappingAppointment) {
            return NextResponse.json({ message: 'This time slot is already booked or overlaps with another appointment.' }, { status: 409 });
        }
        // ---- End overlap check ----
        
        // Fetch all test definitions from the catalog
        const testDefs = await db.collection<TestCatalogItem>('testCatalog').find({ testCode: { $in: testCodes } }).toArray();

        if (testDefs.length !== testCodes.length) {
            const foundCodes = new Set(testDefs.map(t => t.testCode));
            const missingCodes = testCodes.filter((c: string) => !foundCodes.has(c));
            return NextResponse.json({ message: `One or more invalid test codes provided: ${missingCodes.join(', ')}` }, { status: 400 });
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

        const newOrderId = await getNextOrderId();
        const orderObjectId = new ObjectId();
        
        const newAppointment: Omit<Appointment, '_id'> = {
            patientId: new ObjectId(patientId),
            orderId: orderObjectId, // Link appointment to the new order
            appointmentType: 'Sample Collection',
            scheduledTime: newApptStartTime,
            durationMinutes: parseInt(appointmentDetails.durationMinutes, 10) || 15,
            status: appointmentDetails.status || 'Scheduled',
            notes: appointmentDetails.notes || '',
        };
        const appointmentResult = await db.collection('appointments').insertOne(newAppointment);

        const orderSamples: OrderSample[] = Array.from(samplesByTubeType.entries()).map(([tubeType, tests]) => {
            const testsForSample: OrderTest[] = tests.map((testDef) => ({
                testCode: testDef.testCode,
                name: testDef.name,
                patientFriendlyExplanation: testDef.patientFriendlyExplanation, // Sprint 14 Addition
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
        
        const newOrder: Omit<Order, '_id'> = {
            orderId: newOrderId,
            patientId: new ObjectId(patientId),
            physicianId: new ObjectId(physicianId),
            appointmentId: appointmentResult.insertedId,
            icd10Code,
            priority: priority || 'Routine',
            orderStatus: 'Pending',
            samples: orderSamples,
            createdAt: new Date(),
            createdBy: new ObjectId(userPayload.userId as string),
            updatedAt: new Date(),
        };

        const result = await db.collection('orders').insertOne({ ...newOrder, _id: orderObjectId });

        // --- Audit Log Entry ---
        await db.collection('auditLogs').insertOne({
            timestamp: new Date(),
            userId: new ObjectId(userPayload.userId as string),
            action: 'ORDER_CREATE',
            entity: {
                collectionName: 'orders',
                documentId: orderObjectId,
            },
            details: {
                orderId: newOrderId,
                patientId: patientId,
                tests: testCodes,
                message: `New order ${newOrderId} created.`
            },
            ipAddress: req.ip || req.headers.get('x-forwarded-for'),
        });
        // --- End Audit Log ---

        const createdOrder = { ...newOrder, _id: orderObjectId };
        
        return NextResponse.json({ ...createdOrder, id: orderObjectId.toHexString(), orderId: newOrderId }, { status: 201 });

    } catch (error) {
        console.error('Failed to create order:', error);
        if (error instanceof Error && error.message.includes("Argument passed in must be a single String")) {
             return NextResponse.json({ message: 'Invalid ID format for patient or physician.' }, { status: 400 });
        }
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

// GET orders with search and filtering
export async function GET(req: NextRequest) {
    try {
        const token = req.headers.get('authorization')?.split(' ')[1];
        if (!token) return NextResponse.json({ message: 'Authorization token missing.' }, { status: 401 });
        const userPayload = await decrypt(token);
        if (!userPayload?.userId) return NextResponse.json({ message: 'Invalid or expired token.' }, { status: 401 });


        const { searchParams } = new URL(req.url);
        const query = searchParams.get('q');
        const collectedDate = searchParams.get('collectedDate');
        const sampleStatus = searchParams.get('sampleStatus');
        const status = searchParams.get('status');
        const priority = searchParams.get('priority');
        
        const { db } = await connectToDatabase();

        let aggregationPipeline: any[] = [];
        
        let matchStage: any = { $match: {} };
        
        // --- RBAC: Restrict data access based on role ---
        if (userPayload.role === 'physician') {
            matchStage.$match.physicianId = new ObjectId(userPayload.userId as string);
        } else if (userPayload.role === 'patient') {
            const patient = await db.collection('patients').findOne({ userId: new ObjectId(userPayload.userId as string) });
            if (patient) {
                matchStage.$match.patientId = patient._id;
            } else {
                return NextResponse.json([], { status: 200 }); // Return empty if no patient found for user
            }
        }
        // --- End RBAC ---

        if (status && status !== 'All') {
            matchStage.$match.orderStatus = status;
        }
        if (priority && priority !== 'All') {
            matchStage.$match.priority = priority;
        }


        // Date and Status based filtering for Accessioning page
        if (collectedDate && sampleStatus) {
            const targetDate = new Date(collectedDate + 'T00:00:00');
            const dayStart = startOfDay(targetDate);
            const dayEnd = endOfDay(targetDate);
            matchStage.$match['samples'] = {
                $elemMatch: {
                    status: sampleStatus,
                    collectionTimestamp: {
                        $gte: dayStart,
                        $lte: dayEnd,
                    }
                }
            };
        }
        // General query based searching
        else if (query) {
             const searchRegex = new RegExp(query, 'i');
            matchStage.$match['$or'] = [
                { orderId: searchRegex },
                { 'samples.accessionNumber': searchRegex },
                { 'patientInfo.mrn': searchRegex },
                { 'patientInfo.firstName': searchRegex },
                { 'patientInfo.lastName': searchRegex },
                { 'patientInfo.contactInfo.phone': searchRegex },
            ];
        }

        // Add patient info lookup before matching if search query involves patient OR if user is a physician/patient
        if (query || ['physician', 'patient'].includes(userPayload.role)) {
            aggregationPipeline.push({
                $lookup: {
                    from: 'patients',
                    localField: 'patientId',
                    foreignField: '_id',
                    as: 'patientInfo'
                }
            }, { 
                $unwind: { path: "$patientInfo", preserveNullAndEmptyArrays: true }
            });
        }
        
        if (Object.keys(matchStage.$match).length > 0) {
            aggregationPipeline.push(matchStage);
        }
        
        // Add patient info lookup if it wasn't added before (for internal roles without a query)
        if (!query && !['physician', 'patient'].includes(userPayload.role)) {
             aggregationPipeline.push({
                $lookup: {
                    from: 'patients',
                    localField: 'patientId',
                    foreignField: '_id',
                    as: 'patientInfo'
                }
            }, { 
                $unwind: { path: "$patientInfo", preserveNullAndEmptyArrays: true }
            });
        }

        aggregationPipeline.push({ $sort: { createdAt: -1 } });
        aggregationPipeline.push({ $limit: 50 });

        const orders = await db.collection('orders').aggregate(aggregationPipeline).toArray();

        const clientOrders = orders.map(order => {
          const { _id, ...rest } = order;
          const patientInfo = rest.patientInfo ? { ...rest.patientInfo, id: rest.patientInfo._id.toHexString(), _id: undefined } : undefined;
          
          const samples = order.samples.map((s: any) => ({
              ...s,
              sampleId: s.sampleId.toHexString()
          }));

          return { ...rest, id: _id.toHexString(), patientInfo, samples, appointmentId: rest.appointmentId?.toHexString() };
        });

        return NextResponse.json(clientOrders, { status: 200 });

    } catch (error) {
        console.error('Failed to fetch orders:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
