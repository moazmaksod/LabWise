import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { hash } from 'bcryptjs';
import { USERS, MOCK_USERS_FOR_UI } from '@/lib/constants';
import type { ClientUser, Role } from '@/lib/types';

// GET all users
export async function GET(req: NextRequest) {
    // This is a mock implementation. In a real scenario, you'd fetch from the DB.
    // const { db } = await connectToDatabase();
    // const users = await db.collection('users').find({}).toArray();
    // const clientUsers = users.map(user => {
    //     const { passwordHash, ...clientUser } = user;
    //     return { ...clientUser, id: user._id.toHexString() };
    // });
    return NextResponse.json(MOCK_USERS_FOR_UI);
}

// POST a new user
export async function POST(req: NextRequest) {
    try {
        const { firstName, lastName, email, role, password } = await req.json();

        if (!firstName || !lastName || !email || !role || !password) {
            return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
        }

        // This is a mock implementation.
        console.log('Creating user (mock):', { firstName, lastName, email, role });
        
        const newUser: ClientUser = {
            id: `user-mock-${Math.random().toString(36).substring(7)}`,
            firstName,
            lastName,
            email,
            role: role as Role,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            avatar: `https://i.pravatar.cc/150?u=${email}`
        };

        MOCK_USERS_FOR_UI.push(newUser);
        
        // In a real scenario:
        // const { db } = await connectToDatabase();
        // const existingUser = await db.collection('users').findOne({ email });
        // if (existingUser) {
        //     return NextResponse.json({ message: 'User with this email already exists' }, { status: 409 });
        // }
        // const passwordHash = await hash(password, 10);
        // const result = await db.collection('users').insertOne({ ... });
        
        return NextResponse.json(newUser, { status: 201 });

    } catch (error) {
        console.error('Failed to create user:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
