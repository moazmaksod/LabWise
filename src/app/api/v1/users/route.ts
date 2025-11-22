
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { hash } from 'bcryptjs';
import type { Role, User } from '@/lib/types';

// GET all users (with role filter)
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const role = searchParams.get('role');

        const { db } = await connectToDatabase();

        let filter: any = {};
        if (role) {
            filter.role = role;
        }
        
        const users = await db.collection('users').find(filter).sort({ createdAt: -1 }).toArray();
        
        const clientUsers = users.map(user => {
            const { passwordHash, _id, ...clientUser } = user;
            return { ...clientUser, id: _id.toHexString() };
        });

        return NextResponse.json(clientUsers);
    } catch (error) {
        console.error('Failed to fetch users:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

// POST a new user
export async function POST(req: NextRequest) {
    try {
        const { firstName, lastName, email, role, password } = await req.json();

        if (!firstName || !lastName || !email || !role || !password) {
            return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
        }

        const { db } = await connectToDatabase();
        
        const existingUser = await db.collection('users').findOne({ email });
        if (existingUser) {
            return NextResponse.json({ message: 'User with this email already exists' }, { status: 409 });
        }
        
        const passwordHash = await hash(password, 10);
        
        const newUserDocument: Omit<User, '_id'> = {
            firstName,
            lastName,
            email,
            role: role as Role,
            passwordHash,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            avatar: `https://i.pravatar.cc/150?u=${email}`,
            trainingRecords: [], // Initialize with empty array
        };

        const result = await db.collection('users').insertOne(newUserDocument);

        const createdUser = {
            id: result.insertedId.toHexString(),
            ...newUserDocument
        };
        
        const { passwordHash: _, ...clientUser } = createdUser;

        return NextResponse.json(clientUser, { status: 201 });

    } catch (error) {
        console.error('Failed to create user:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
