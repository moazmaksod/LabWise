import { NextRequest, NextResponse } from 'next/server';
import { compare } from 'bcryptjs';
import { encrypt } from '@/lib/auth';
import type { User } from '@/lib/types';
import { USERS } from '@/lib/constants'; 

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required.' }, { status: 400 });
    }

    const userByEmail = Object.values(USERS).find(u => u.email === email);
    
    if (!userByEmail) {
        return NextResponse.json({ message: 'Invalid credentials.' }, { status: 401 });
    }

    const accessToken = await encrypt({ userId: userByEmail.id, role: userByEmail.role });

    const response = NextResponse.json({ accessToken }, { status: 200 });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}
