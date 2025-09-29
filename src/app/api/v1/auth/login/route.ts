
import { NextRequest, NextResponse } from 'next/server';
import { encrypt } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { compare, hash } from 'bcryptjs';
import type { Role, User } from '@/lib/types';
import { USERS } from '@/lib/constants';
import { ObjectId } from 'mongodb';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    console.log(`[DEBUG] Attempting login for email: ${email}`);

    if (!email || !password) {
      console.log('[DEBUG] Login failed: Email or password not provided.');
      return NextResponse.json({ message: 'Email and password are required.' }, { status: 400 });
    }
    
    const { db } = await connectToDatabase();
    let user = await db.collection<User>('users').findOne({ email });

    // --- Development Only: Auto-seed mock users ---
    if (!user && Object.values(USERS).some(u => u.email === email)) {
        console.log(`[DEBUG] User not found for ${email}. Entering auto-seeding logic.`);
        const mockUser = Object.values(USERS).find(u => u.email === email)!;
        
        // Use the provided password for seeding, or the default dev password
        const passwordToSeed = password || 'password123';
        console.log('[DEBUG] Seeding user with provided/default password.');

        const passwordHash = await hash(passwordToSeed, 10);
        console.log('[DEBUG] Password hashed successfully.');
            
        const newUserDocument: Omit<User, '_id'> = {
            firstName: mockUser.firstName,
            lastName: mockUser.lastName,
            email: mockUser.email,
            role: mockUser.role,
            passwordHash,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            avatar: mockUser.avatar
        };

        const result = await db.collection('users').insertOne(newUserDocument);
        console.log(`[DEBUG] MongoDB insert result: ${result.acknowledged ? 'acknowledged' : 'failed'}`);
        
        if (result.acknowledged) {
            // After seeding, refetch the user to proceed with login
            user = await db.collection<User>('users').findOne({ _id: result.insertedId });
            console.log(`[DEBUG] Refetched newly seeded user: ${user ? user.email : 'null'}`);
        } else {
             console.log('[DEBUG] Seeding failed. Could not insert user into database.');
             return NextResponse.json({ message: 'User seeding failed during development.' }, { status: 500 });
        }
    }
    // --- End Development Only ---

    if (!user) {
      console.log(`[DEBUG] Final check: User not found for email ${email}. Responding with 401.`);
      return NextResponse.json({ message: 'Invalid credentials.' }, { status: 401 });
    }
    
    console.log(`[DEBUG] User found: ${user.email}. Comparing passwords.`);
    const isPasswordValid = await compare(password, user.passwordHash);
    console.log(`[DEBUG] Password validation result for ${user.email}: ${isPasswordValid}`);

    if (!isPasswordValid) {
      console.log(`[DEBUG] Password for ${user.email} is invalid. Responding with 401.`);
      return NextResponse.json({ message: 'Invalid credentials.' }, { status: 401 });
    }

    if (!user.isActive) {
      console.log(`[DEBUG] User ${user.email} is inactive. Responding with 403.`);
      return NextResponse.json({ message: 'This account has been deactivated.' }, { status: 403 });
    }

    console.log(`[DEBUG] Login successful for ${user.email}. Generating token.`);
    const accessToken = await encrypt({ userId: user._id.toHexString(), role: user.role });

    return NextResponse.json({ accessToken }, { status: 200 });

  } catch (error) {
    console.error('[DEBUG] An unexpected error occurred in login route:', error);
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}
