
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// GET inventory items
export async function GET(req: NextRequest) {
    try {
        const { db } = await connectToDatabase();
        const items = await db.collection('inventoryItems').find({}).sort({ itemName: 1 }).toArray();
        
        const clientItems = items.map(item => ({
            id: item._id.toHexString(),
            ...item,
            _id: undefined
        }));

        return NextResponse.json(clientItems);
    } catch (error) {
        return NextResponse.json({ message: 'Error' }, { status: 500 });
    }
}

// POST new inventory item
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        // Validation would go here
        
        const { db } = await connectToDatabase();
        const result = await db.collection('inventoryItems').insertOne({
            ...body,
            quantityOnHand: parseInt(body.quantityOnHand),
            minStockLevel: parseInt(body.minStockLevel),
            expirationDate: new Date(body.expirationDate),
            createdAt: new Date(),
            updatedAt: new Date()
        });
        
        return NextResponse.json({ id: result.insertedId.toHexString(), ...body });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Error creating item' }, { status: 500 });
    }
}
