import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import type { User, ClientUser } from '@/lib/types';
import { USERS } from '@/lib/constants';


export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return NextResponse.json({ message: 'Authorization token missing.' }, { status: 401 });
  }

  const decryptedPayload = await decrypt(token);

  if (!decryptedPayload || !decryptedPayload.userId) {
    return NextResponse.json({ message: 'Invalid or expired token.' }, { status: 401 });
  }

  try {
    const userById = Object.values(USERS).find(u => u.id === decryptedPayload.userId);

    if (!userById) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }
    
    return NextResponse.json(userById, { status: 200 });

  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}
