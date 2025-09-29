import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import type { ClientUser, User } from '@/lib/types';

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
    const { db } = await connectToDatabase();
    const user = await db.collection<User>('users').findOne({ _id: new ObjectId(decryptedPayload.userId as string) });

    if (!user) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }
    
    // Create a client-safe user object, removing the password hash
    const { passwordHash, _id, ...restOfUser } = user;
    
    const clientUser: ClientUser = {
      id: _id.toHexString(),
      ...restOfUser
    };
    
    return NextResponse.json(clientUser, { status: 200 });

  } catch (error) {
    console.error('Error fetching user profile:', error);
    if (error instanceof Error && error.message.includes('Argument passed in must be a single String')) {
        return NextResponse.json({ message: 'Invalid user ID format in token.' }, { status: 400 });
    }
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}
