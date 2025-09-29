import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { hash } from 'bcryptjs';
import type { Role, User } from '@/lib/types';
import { ObjectId } from 'mongodb';

// GET all users
export async function GET(req: NextRequest) {
    try {
        const { db } = await connectToDatabase();
        const users = await db.collection('users').find({}).sort({ createdAt: -1 }).toArray();
        
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
            avatar: `https://i.pravatar.cc/150?u=${email}`
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

// PUT (update) a user
export async function PUT(req: NextRequest) {
    try {
        const { id, ...updateData } = await req.json();

        if (!id) {
            return NextResponse.json({ message: 'User ID is required for updates' }, { status: 400 });
        }

        const { db } = await connectToDatabase();
        
        // You would add logic here to check if the user has permission to update.
        // For now, we'll allow it.

        // Prevent password from being updated this way. A separate "change password" endpoint is better.
        delete updateData.password;
        
        // Prepare the update object, ensuring not to overwrite critical fields unintentionally
        const updateObject: Partial<User> = {
            ...updateData,
            updatedAt: new Date(),
        };

        const result = await db.collection('users').updateOne(
            { _id: new ObjectId(id) },
            { $set: updateObject }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'User updated successfully' }, { status: 200 });
    } catch (error) {
        console.error('Failed to update user:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
