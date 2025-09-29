import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import type { User, ClientUser } from '@/lib/types';
import { USERS } from '@/lib/constants'; // Import mock users


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
    // --- TEMPORARY MOCK USER FETCHING ---
    const userById = Object.values(USERS).find(u => u.id === decryptedPayload.userId);

    if (!userById) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }
    
    return NextResponse.json(userById, { status: 200 });
    // --- END TEMPORARY MOCK USER FETCHING ---

    /*
    // --- REAL DATABASE USER FETCHING (Commented out for prototype) ---
    const { db } = await connectToDatabase();
    const usersCollection = db.collection<User>('users');

    const user = await usersCollection.findOne({ _id: new ObjectId(decryptedPayload.userId) });

    if (!user) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }
    
    if (!user.isActive) {
        return NextResponse.json({ message: 'User account is inactive.' }, { status: 403 });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...userWithoutPassword } = user;

    const clientUser: ClientUser = {
      ...userWithoutPassword,
      _id: user._id, // Keep original ObjectId
    };
    
    return NextResponse.json(clientUser, { status: 200 });
    */

  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}
