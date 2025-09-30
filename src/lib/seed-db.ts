// DO NOT USE THIS FILE IN PRODUCTION
// This is a one-time script to seed the database with mock user data for development.

import { connectToDatabase } from '@/lib/mongodb';
import { hash } from 'bcryptjs';
import { USERS } from '@/lib/constants';
import type { User, Appointment, Patient } from '@/lib/types';
import { MongoClient, ObjectId } from 'mongodb';

async function seedAppointments(db: any) {
    const appointmentsCollection = db.collection('appointments');
    const count = await appointmentsCollection.countDocuments();
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
        { patientId: patients[0]._id, scheduledTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0), durationMinutes: 15, status: 'Completed' },
        { patientId: patients[1]._id, scheduledTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 15), durationMinutes: 15, status: 'Completed' },
        { patientId: patients[2]._id, scheduledTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 30), durationMinutes: 15, status: 'CheckedIn' },
        { patientId: patients[3]._id, scheduledTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 45), durationMinutes: 15, status: 'Scheduled' },
        { patientId: patients[4]._id, scheduledTime: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0), durationMinutes: 15, status: 'Scheduled' },
    ];
    await appointmentsCollection.insertMany(appointmentsToInsert);
    console.log('Appointments seeded successfully.');
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
        const usersCollection = db.collection('users');
        const count = await usersCollection.countDocuments();
        
        if (count === 0) {
            console.log('Database is empty. Seeding with mock users...');
            const usersToInsert: Omit<User, '_id'>[] = [];
            for (const user of Object.values(USERS)) {
                const passwordHash = await hash('password123', 10);
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
            await usersCollection.insertMany(usersToInsert);
            console.log('Users seeded successfully!');
        } else {
            console.log('Users collection already seeded. Skipping.');
        }

        await seedAppointments(db);

    } catch (error) {
        console.error('Error during database seed check:', error);
    } finally {
        if (client) {
            await client.close();
        }
    }
}
