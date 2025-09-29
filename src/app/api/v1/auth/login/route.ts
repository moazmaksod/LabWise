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

    const isPasswordValid = await compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return NextResponse.json({ message: 'Invalid credentials.' }, { status: 401 });
    }

    const accessToken = await encrypt({ userId: user._id.toHexString(), role: user.role });

    const response = NextResponse.json({ accessToken }, { status: 200 });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}
