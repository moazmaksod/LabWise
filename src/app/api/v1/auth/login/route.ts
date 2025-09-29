import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { compare } from 'bcryptjs';
import { encrypt } from '@/lib/auth';
import type { User } from '@/lib/types';
import { USERS } from '@/lib/constants'; // Import mock users

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required.' }, { status: 400 });
    }

    // --- TEMPORARY MOCK AUTHENTICATION ---
    // This block simulates database interaction for prototype purposes.
    // It will be replaced with real database queries.
    const userByEmail = Object.values(USERS).find(u => u.email === email);
    
    if (!userByEmail) {
        return NextResponse.json({ message: 'Invalid credentials.' }, { status: 401 });
    }

    // For the prototype, we assume any password is correct if the email exists.
    // In a real scenario, you'd compare a hashed password.
    // const passwordsMatch = await compare(password, user.passwordHash);
    // if (!passwordsMatch) { ... }

    const accessToken = await encrypt({ userId: userByEmail.id, role: userByEmail.role });

    const response = NextResponse.json({ accessToken }, { status: 200 });

    return response;
    // --- END TEMPORARY MOCK AUTHENTICATION ---


    /* 
    // --- REAL DATABASE AUTHENTICATION (Commented out for prototype) ---
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

    return response;
    */

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}
