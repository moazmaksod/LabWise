// DO NOT USE THIS FILE IN PRODUCTION
// This is a one-time script to seed the database with mock user data for development.

import { connectToDatabase } from '@/lib/mongodb';
import { hash } from 'bcryptjs';
import { USERS } from '@/lib/constants';
import type { User } from '@/lib/types';
import { ObjectId } from 'mongodb';

export async function seedDatabase() {
  try {
    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');

    // Check if the manager user already exists to prevent re-seeding
    const managerUser = Object.values(USERS).find(u => u.role === 'manager');
    if (!managerUser) {
        console.log('Manager user not found in mock data. Skipping seed.');
        return;
    }

    const existingUser = await usersCollection.findOne({ email: managerUser.email });
    if (existingUser) {
      console.log('Database already seeded. Skipping.');
      return;
    }

    console.log('Seeding database with mock users...');

    const usersToInsert = [];

    for (const user of Object.values(USERS)) {
      // Use a standard password for all mock users
      const passwordHash = await hash('password123', 10);
      
      const newUserDocument: Omit<User, '_id'> = {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        passwordHash,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        avatar: user.avatar
      };
      usersToInsert.push(newUserDocument);
    }
    
    await usersCollection.insertMany(usersToInsert);

    console.log('Database seeded successfully!');

  } catch (error) {
    console.error('Error seeding database:', error);
  }
}
