
import { NextRequest, NextResponse } from 'next/server';
import { encrypt } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { compare, hash } from 'bcryptjs';
import type { Role, User } from '@/lib/types';
import { USERS } from '@/lib/constants';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required.' }, { status: 400 });
    }
    
    const { db } = await connectToDatabase();
    let user = await db.collection<User>('users').findOne({ email });
    let isPasswordValid = false;

    // --- Development Only: Auto-seed mock users ---
    if (!user && Object.values(USERS).some(u => u.email === email)) {
        const mockUser = Object.values(USERS).find(u => u.email === email)!;
        // For mock users, we assume a default password for seeding
        if (password === 'password123') {
            const passwordHash = await hash(password, 10);
            
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
            user = await db.collection<User>('users').findOne({ _id: result.insertedId });
            isPasswordValid = true; // The user was just created with this password
        }
    }
    // --- End Development Only ---

    if (!user) {
      return NextResponse.json({ message: 'Invalid credentials.' }, { status: 401 });
    }

    // If password wasn't validated during seeding, check it now
    if (!isPasswordValid) {
        isPasswordValid = await compare(password, user.passwordHash);
    }

    if (!isPasswordValid) {
      return NextResponse.json({ message: 'Invalid credentials.' }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json({ message: 'This account has been deactivated.' }, { status: 403 });
    }

    const accessToken = await encrypt({ userId: user._id.toHexString(), role: user.role });

    const response = NextResponse.json({ accessToken }, { status: 200 });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}
