
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import type { User } from '@/lib/types';

// GET a single user
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { id } = params;

        if (!ObjectId.isValid(id)) {
             return NextResponse.json({ message: 'Invalid User ID' }, { status: 400 });
        }

        const { db } = await connectToDatabase();
        const user = await db.collection('users').findOne({ _id: new ObjectId(id) });

        if (!user) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        const { passwordHash, _id, ...clientUser } = user;
        return NextResponse.json({ ...clientUser, id: _id.toHexString() });

    } catch (error) {
        console.error('Failed to fetch user:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

// PUT (update) a user
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { id } = params;
        const updateData = await req.json();

        if (!ObjectId.isValid(id)) {
            return NextResponse.json({ message: 'Invalid User ID' }, { status: 400 });
        }

        const { db } = await connectToDatabase();

        // Prevent password from being updated this way.
        delete updateData.password;
        delete updateData._id; // Prevent immutable field updates

        const updateObject: Partial<User> = {
            ...updateData,
            updatedAt: new Date(),
        };

        if (updateData.trainingRecords) {
            updateObject.trainingRecords = updateData.trainingRecords.map((rec: any) => ({
                ...rec,
                completionDate: new Date(rec.completionDate),
                expiryDate: new Date(rec.expiryDate),
            }));
        }

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

// DELETE a user (Soft Delete by deactivating)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { id } = params;

        if (!ObjectId.isValid(id)) {
             return NextResponse.json({ message: 'Invalid User ID' }, { status: 400 });
        }

        const { db } = await connectToDatabase();

        // We perform a soft delete by setting isActive to false
        const result = await db.collection('users').updateOne(
            { _id: new ObjectId(id) },
            { $set: { isActive: false, updatedAt: new Date() } }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'User deactivated successfully' }, { status: 200 });
    } catch (error) {
        console.error('Failed to deactivate user:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
