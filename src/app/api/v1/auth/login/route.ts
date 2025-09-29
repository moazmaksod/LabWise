import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { compare } from 'bcryptjs';
import { encrypt } from '@/lib/auth';
import type { User } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required.' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const usersCollection = db.collection<User>('users');

    const user = await usersCollection.findOne({ email });

    if (!user) {
      return NextResponse.json({ message: 'Invalid credentials.' }, { status: 401 });
    }

    const passwordsMatch = await compare(password, user.passwordHash);

    if (!passwordsMatch) {
      return NextResponse.json({ message: 'Invalid credentials.' }, { status: 401 });
    }

    if (!user.isActive) {
        return NextResponse.json({ message: 'User account is inactive.' }, { status: 403 });
    }

    // Create a JWT token
    const accessToken = await encrypt({ userId: user._id.toHexString(), role: user.role });

    const response = NextResponse.json({ accessToken }, { status: 200 });

    // In a real application, you'd set the token in an HttpOnly cookie
    // For this prototype, we return it in the body for the client to handle
    
    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}
