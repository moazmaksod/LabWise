// DO NOT USE THIS FILE IN PRODUCTION
// This is a one-time script to seed the database with mock user data for development.

import { connectToDatabase } from '@/lib/mongodb';
import { hash } from 'bcryptjs';
import { USERS } from '@/lib/constants';
import type { User } from '@/lib/types';
import { MongoClient } from 'mongodb';

async function seedDatabaseInternal() {
  let client;
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    const MONGODB_DB = process.env.MONGODB_DB;

    if (!MONGODB_URI || !MONGODB_DB) {
        throw new Error('MongoDB connection details missing from environment variables.');
    }
    
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(MONGODB_DB);

    const usersCollection = db.collection('users');

    // Check if the collection is empty
    const count = await usersCollection.countDocuments();
    if (count > 0) {
      console.log('Database already contains users. Skipping seed.');
      return;
    }

    console.log('Database is empty. Seeding with mock users...');

    const usersToInsert = [];

    for (const user of Object.values(USERS)) {
      const passwordHash = await hash('password123', 10);
      
      const newUserDocument: Omit<User, '_id'> = {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        passwordHash,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        avatar: user.avatar
      };
      usersToInsert.push(newUserDocument);
    }
    
    await usersCollection.insertMany(usersToInsert);

    console.log('Database seeded successfully!');

  } catch (error) {
    console.error('Error seeding database:', error);
    // Ensure the process exits with an error code if seeding fails
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
    }
  }
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
            const usersToInsert = [];
            for (const user of Object.values(USERS)) {
                const passwordHash = await hash('password123', 10);
                usersToInsert.push({ ...user, passwordHash });
            }
            await usersCollection.insertMany(usersToInsert);
            console.log('Database seeded successfully!');
        } else {
            console.log('Database already seeded. Skipping.');
        }
    } catch (error) {
        console.error('Error during database seed check:', error);
    } finally {
        if (client) {
            await client.close();
        }
    }
}
