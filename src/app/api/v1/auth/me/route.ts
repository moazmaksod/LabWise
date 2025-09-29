import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/auth';
import type { ClientUser } from '@/lib/types';
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
    // The payload userId might contain slashes which would fail a direct lookup.
    // However, since our mock USERS object keys are the same as the user IDs,
    // we can look it up directly.
    const userById = USERS[decryptedPayload.userId as keyof typeof USERS];

    if (!userById) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }
    
    // We create a client-safe user object without the password hash.
    // In our mock, there is no hash, but this is good practice.
    const clientUser: ClientUser = {
      id: userById.id,
      firstName: userById.firstName,
      lastName: userById.lastName,
      email: userById.email,
      role: userById.role,
      avatar: userById.avatar,
      isActive: userById.isActive,
      createdAt: userById.createdAt,
      updatedAt: userById.updatedAt,
    }
    
    return NextResponse.json(clientUser, { status: 200 });

  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}
