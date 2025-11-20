
import { NextRequest, NextResponse } from 'next/server';
import { encrypt } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { compare } from 'bcryptjs';
import type { User } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required.' }, { status: 400 });
    }
    
    const { db } = await connectToDatabase();
    const user = await db.collection<User>('users').findOne({ email });

    if (!user) {
        return NextResponse.json({ message: 'Invalid credentials.' }, { status: 401 });
    }

    // Security Enhancement: Only allow portal roles to use this login
    if (user.role !== 'physician' && user.role !== 'patient') {
        return NextResponse.json({ message: 'Access denied. Please use the main application login.' }, { status: 403 });
    }
    
    const isPasswordValid = await compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return NextResponse.json({ message: 'Invalid credentials.' }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json({ message: 'This account has been deactivated.' }, { status: 403 });
    }

    // --- Audit Log Entry ---
    await db.collection('auditLogs').insertOne({
        timestamp: new Date(),
        userId: user._id,
        action: 'PORTAL_USER_LOGIN',
        entity: {
            collectionName: 'users',
            documentId: user._id,
        },
        details: {
            email: user.email,
            message: `Portal user ${user.firstName} ${user.lastName} logged in successfully.`,
        },
        ipAddress: req.ip || req.headers.get('x-forwarded-for'),
    });
    // --- End Audit Log ---

    const accessToken = await encrypt({ userId: user._id.toHexString(), role: user.role });

    return NextResponse.json({ accessToken }, { status: 200 });

  } catch (error) {
    console.error('An unexpected error occurred in portal login route:', error);
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}
