
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// GET a single test
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { id } = params;

        if (!ObjectId.isValid(id)) {
             return NextResponse.json({ message: 'Invalid Test ID' }, { status: 400 });
        }

        const { db } = await connectToDatabase();
        const test = await db.collection('testCatalog').findOne({ _id: new ObjectId(id) });

        if (!test) {
            return NextResponse.json({ message: 'Test not found' }, { status: 404 });
        }

        const { _id, ...clientTest } = test;
        return NextResponse.json({ ...clientTest, id: _id.toHexString() });

    } catch (error) {
        console.error('Failed to fetch test:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

// PUT (update) a test
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { id } = params;
        const updateData = await req.json();

        if (!ObjectId.isValid(id)) {
            return NextResponse.json({ message: 'Invalid Test ID' }, { status: 400 });
        }

        const { db } = await connectToDatabase();

        delete updateData._id; // Prevent immutable field updates

        const result = await db.collection('testCatalog').updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json({ message: 'Test not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Test updated successfully' }, { status: 200 });
    } catch (error) {
        console.error('Failed to update test:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

// DELETE a test (Hard delete for catalog items usually, or soft delete. Using soft delete is safer)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { id } = params;

        if (!ObjectId.isValid(id)) {
             return NextResponse.json({ message: 'Invalid Test ID' }, { status: 400 });
        }

        const { db } = await connectToDatabase();

        // Soft delete by setting isActive to false
        const result = await db.collection('testCatalog').updateOne(
             { _id: new ObjectId(id) },
             { $set: { isActive: false } }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json({ message: 'Test not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Test deactivated successfully' }, { status: 200 });
    } catch (error) {
        console.error('Failed to deactivate test:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
