// DO NOT USE THIS FILE IN PRODUCTION
// This is a one-time script to seed the database with mock user data for development.

import { connectToDatabase } from '@/lib/mongodb';
import { hash } from 'bcryptjs';
import { USERS } from '@/lib/constants';
import type { User, Appointment, Patient, Instrument, QCLog } from '@/lib/types';
import { MongoClient, Db, ObjectId } from 'mongodb';

async function seedAppointments(db: Db) {
    const appointmentsCollection = db.collection('appointments');
    const count = await appointmentsCollection.countDocuments();
    
    // Check for unique index and drop if it exists
    try {
        const indexes = await appointmentsCollection.indexes();
        const uniqueTimeIndex = indexes.find(idx => idx.key && idx.key.scheduledTime === 1 && idx.unique);
        if (uniqueTimeIndex) {
            console.log('Dropping incorrect unique index on scheduledTime...');
            await appointmentsCollection.dropIndex('scheduledTime_1');
            console.log('Unique index dropped.');
        }
    } catch (e) {
        // Ignore errors if index doesn't exist
    }


    if (count > 0) {
        return; // Already seeded
    }

    console.log('Seeding appointments...');

    const patients = await db.collection('patients').find({}).limit(5).toArray();
    if (patients.length < 5) {
        console.log('Not enough patients to seed appointments. Please seed patients first.');
        return;
    }
    
    const now = new Date();
    const appointmentsToInsert: Omit<Appointment, '_id'>[] = [
        { patientId: patients[0]._id, scheduledTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0), durationMinutes: 15, status: 'Completed', notes: 'Patient was a little late.', appointmentType: 'Consultation' },
        { patientId: patients[1]._id, scheduledTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 15), durationMinutes: 15, status: 'Completed', notes: '', appointmentType: 'Consultation' },
        { patientId: patients[2]._id, scheduledTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 30), durationMinutes: 15, status: 'CheckedIn', notes: 'Waiting for phlebotomist.', appointmentType: 'Sample Collection' },
        { patientId: patients[3]._id, scheduledTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 45), durationMinutes: 15, status: 'Scheduled', notes: '', appointmentType: 'Sample Collection' },
        { patientId: patients[4]._id, scheduledTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0), durationMinutes: 15, status: 'Scheduled', notes: 'Needs a butterfly needle.', appointmentType: 'Sample Collection' },
    ];
    await appointmentsCollection.insertMany(appointmentsToInsert);

    // Create a non-unique index for performance
    await appointmentsCollection.createIndex({ scheduledTime: 1 });

    console.log('Appointments seeded successfully.');
}

async function seedUsers(db: Db) {
    const usersCollection = db.collection('users');
    const existingUsers = await usersCollection.find({}, { projection: { email: 1 } }).toArray();
    const existingUserEmails = new Set(existingUsers.map(u => u.email));

    const usersToInsert: Omit<User, '_id'>[] = [];
    const passwordHash = await hash('password123', 10);

    for (const user of Object.values(USERS)) {
        if (!existingUserEmails.has(user.email)) {
            console.log(`User ${user.email} not found. Adding to seed list.`);
            usersToInsert.push({
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                avatar: user.avatar,
                isActive: user.isActive,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
                passwordHash
            });
        }
    }

    if (usersToInsert.length > 0) {
        console.log(`Seeding ${usersToInsert.length} new mock users...`);
        await usersCollection.insertMany(usersToInsert);
        console.log('New users seeded successfully!');
    } else {
        // console.log('All mock users already exist in the database. Skipping user seed.');
    }
}

async function seedInstruments(db: Db) {
    const instrumentsCollection = db.collection('instruments');
    const count = await instrumentsCollection.countDocuments();
    if (count > 0) {
        return; // Already seeded
    }

    console.log('Seeding instruments...');
    const instrumentsToInsert: Omit<Instrument, '_id'>[] = [
        { instrumentId: 'INST-001', name: 'ARCHITECT c4000', model: 'Chemistry Analyzer', status: 'Online', lastCalibrationDate: new Date('2024-07-26'), createdAt: new Date(), updatedAt: new Date() },
        { instrumentId: 'INST-002', name: 'Sysmex XN-1000', model: 'Hematology Analyzer', status: 'Online', lastCalibrationDate: new Date('2024-07-25'), createdAt: new Date(), updatedAt: new Date() },
        { instrumentId: 'INST-003', name: 'ACL TOP 550', model: 'Coagulation Analyzer', status: 'Maintenance', lastCalibrationDate: new Date('2024-07-20'), createdAt: new Date(), updatedAt: new Date() },
        { instrumentId: 'INST-004', name: 'VITEK 2 Compact', model: 'Microbiology Analyzer', status: 'Offline', lastCalibrationDate: new Date('2024-07-22'), createdAt: new Date(), updatedAt: new Date() },
    ];

    await instrumentsCollection.insertMany(instrumentsToInsert);
    await instrumentsCollection.createIndex({ instrumentId: 1 }, { unique: true });
    console.log('Instruments seeded successfully.');
}

async function seedQcLogs(db: Db) {
    const qcLogsCollection = db.collection('qcLogs');
    // Just ensure indexes exist, no seeding needed for logs.
    await qcLogsCollection.createIndex({ instrumentId: 1 });
    await qcLogsCollection.createIndex({ runTimestamp: -1 });
}


// A wrapper to ensure the seeding logic is self-contained and handles its own DB connection.
export async function seedDatabase() {
    // We check for an environment variable to prevent seeding in production environments
    if (process.env.NODE_ENV === 'production') {
        console.log('Skipping database seed in production.');
        return;
    }
    // Need to connect separately here because connectToDatabase depends on this function
    const MONGODB_URI = process.env.MONGODB_URI;
    const MONGODB_DB = process.env.MONGODB_DB;

    if (!MONGODB_URI || !MONGODB_DB) {
        console.error("Cannot seed database. MongoDB connection details missing.");
        return;
    }
    
    let client;
    try {
        client = new MongoClient(MONGODB_URI);
        await client.connect();
        const db = client.db(MONGODB_DB);

        await seedUsers(db);
        await seedAppointments(db);
        await seedInstruments(db);
        await seedQcLogs(db);

    } catch (error) {
        console.error('Error during database seed check:', error);
    } finally {
        if (client) {
            await client.close();
        }
    }
}
