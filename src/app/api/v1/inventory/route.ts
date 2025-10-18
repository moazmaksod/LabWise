
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { decrypt } from '@/lib/auth';
import type { InventoryItem } from '@/lib/types';
import { ObjectId } from 'mongodb';

// GET inventory items
export async function GET(req: NextRequest) {
    try {
        const { db } = await connectToDatabase();
        const { searchParams } = new URL(req.url);
        const lowStock = searchParams.get('lowStock') === 'true';

        let filter: any = {};
        if (lowStock) {
            filter = { $expr: { $lte: ['$quantityOnHand', '$minStockLevel'] } };
        }
        
        const items = await db.collection('inventoryItems').find(filter).sort({ itemName: 1 }).toArray();
        const clientItems = items.map(item => {
            const { _id, ...rest } = item;
            return { ...rest, id: _id.toHexString() };
        });
        return NextResponse.json(clientItems, { status: 200 });
    } catch (error) {
        console.error('Failed to fetch inventory:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

// POST a new inventory item
export async function POST(req: NextRequest) {
    try {
        const token = req.headers.get('authorization')?.split(' ')[1];
        if (!token) return NextResponse.json({ message: 'Authorization token missing.' }, { status: 401 });
        const userPayload = await decrypt(token);
        if (userPayload?.role !== 'manager') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

        const body = await req.json();
        const { itemName, lotNumber, expirationDate, quantityOnHand, minStockLevel, vendor, partNumber } = body;

        if (!itemName || !lotNumber || !expirationDate || quantityOnHand === undefined || minStockLevel === undefined) {
            return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
        }
        
        const { db } = await connectToDatabase();

        const newItem: Omit<InventoryItem, '_id'> = {
            itemName,
            lotNumber,
            expirationDate: new Date(expirationDate),
            quantityOnHand: Number(quantityOnHand),
            minStockLevel: Number(minStockLevel),
            vendor,
            partNumber,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = await db.collection('inventoryItems').insertOne(newItem);
        const createdItem = { ...newItem, _id: result.insertedId };
        
        const { _id, ...clientItem } = createdItem;
        return NextResponse.json({ ...clientItem, id: _id.toHexString() }, { status: 201 });
    } catch (error) {
        console.error('Failed to create inventory item:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
