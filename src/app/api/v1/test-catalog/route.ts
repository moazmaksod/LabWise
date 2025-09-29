
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import type { TestCatalogItem } from '@/lib/types';

// GET all tests
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const query = searchParams.get('q');
        
        const { db } = await connectToDatabase();

        let filter = {};
        if (query) {
            const searchRegex = new RegExp(query, 'i');
            filter = {
                $or: [
                    { name: searchRegex },
                    { testCode: searchRegex },
                ]
            }
        }

        const tests = await db.collection('testCatalog').find(filter).sort({ name: 1 }).limit(10).toArray();
        
        const clientTests = tests.map(test => {
            const { _id, ...clientTest } = test;
            return { ...clientTest, id: _id.toHexString() };
        });

        return NextResponse.json(clientTests);
    } catch (error) {
        console.error('Failed to fetch test catalog:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

// POST a new test
export async function POST(req: NextRequest) {
    try {
        const body: Omit<TestCatalogItem, '_id'> = await req.json();

        // Basic validation
        if (!body.testCode || !body.name) {
            return NextResponse.json({ message: 'Missing required fields: testCode and name' }, { status: 400 });
        }

        const { db } = await connectToDatabase();
        
        const existingTest = await db.collection('testCatalog').findOne({ testCode: body.testCode });
        if (existingTest) {
            return NextResponse.json({ message: 'A test with this code already exists' }, { status: 409 });
        }
        
        const newTestDocument = {
            ...body,
            // Set defaults for fields not in the simplified form
            isPanel: body.isPanel || false,
            panelComponents: body.panelComponents || [],
            referenceRanges: body.referenceRanges || [],
            reflexRules: body.reflexRules || [],
        };
        
        const result = await db.collection('testCatalog').insertOne(newTestDocument);

        return NextResponse.json({ id: result.insertedId.toHexString(), ...newTestDocument }, { status: 201 });

    } catch (error) {
        console.error('Failed to create test:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

// PUT (update) a test
export async function PUT(req: NextRequest) {
    try {
        const { id, ...updateData } = await req.json();

        if (!id) {
            return NextResponse.json({ message: 'Test ID is required for updates' }, { status: 400 });
        }

        const { db } = await connectToDatabase();
        
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
