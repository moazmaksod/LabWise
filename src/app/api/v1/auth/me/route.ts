
import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import type { ClientUser, User } from '@/lib/types';

export async function GET(req: NextRequest) {
  console.log('[/api/v1/auth/me] Received request');
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.split(' ')[1];

  if (!token) {
    console.error('[/api/v1/auth/me] Authorization token missing.');
    return NextResponse.json({ message: 'Authorization token missing.' }, { status: 401 });
  }
  console.log('[/api/v1/auth/me] Token found.');

  const decryptedPayload = await decrypt(token);

  if (!decryptedPayload || !decryptedPayload.userId) {
    console.error('[/api/v1/auth/me] Invalid or expired token.');
    return NextResponse.json({ message: 'Invalid or expired token.' }, { status: 401 });
  }
  console.log('[/api/v1/auth/me] Token decrypted. User ID:', decryptedPayload.userId);


  try {
    console.log('[/api/v1/auth/me] Connecting to database...');
    const { db } = await connectToDatabase();
    console.log('[/api/v1/auth/me] Connected to database. Fetching user...');
    const user = await db.collection<User>('users').findOne({ _id: new ObjectId(decryptedPayload.userId as string) });

    if (!user) {
      console.error('[/api/v1/auth/me] User not found in database for ID:', decryptedPayload.userId);
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }
    console.log('[/api/v1/auth/me] User found in database:', user.email);
    
    // Create a client-safe user object, removing the password hash
    const { passwordHash, _id, ...restOfUser } = user;
    
    const clientUser: ClientUser = {
      id: _id.toHexString(),
      ...restOfUser
    };
    
    console.log('[/api/v1/auth/me] Returning client user object.');
    return NextResponse.json(clientUser, { status: 200 });

  } catch (error) {
    console.error('[/api/v1/auth/me] Error fetching user profile:', error);
    if (error instanceof Error && error.message.includes('Argument passed in must be a single String')) {
        return NextResponse.json({ message: 'Invalid user ID format in token.' }, { status: 400 });
    }
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}
