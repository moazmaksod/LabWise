
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { decrypt } from '@/lib/auth';

// PUT (update) an inventory item
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const id = params.id;
        if (!ObjectId.isValid(id)) {
            return NextResponse.json({ message: 'Invalid inventory item ID format.' }, { status: 400 });
        }

        const token = req.headers.get('authorization')?.split(' ')[1];
        if (!token) return NextResponse.json({ message: 'Authorization token missing.' }, { status: 401 });
        const userPayload = await decrypt(token);
        if (userPayload?.role !== 'manager') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

        const body = await req.json();
        const { itemName, lotNumber, expirationDate, quantityOnHand, minStockLevel, vendor, partNumber } = body;

        const updateData: any = { updatedAt: new Date() };
        if (itemName) updateData.itemName = itemName;
        if (lotNumber) updateData.lotNumber = lotNumber;
        if (expirationDate) updateData.expirationDate = new Date(expirationDate);
        if (quantityOnHand !== undefined) updateData.quantityOnHand = Number(quantityOnHand);
        if (minStockLevel !== undefined) updateData.minStockLevel = Number(minStockLevel);
        if (vendor !== undefined) updateData.vendor = vendor;
        if (partNumber !== undefined) updateData.partNumber = partNumber;

        const { db } = await connectToDatabase();
        const result = await db.collection('inventoryItems').updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json({ message: 'Inventory item not found.' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Inventory item updated successfully.' }, { status: 200 });
    } catch (error) {
        console.error(`Failed to update inventory item ${params.id}:`, error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

// DELETE an inventory item
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const id = params.id;
        if (!ObjectId.isValid(id)) {
            return NextResponse.json({ message: 'Invalid inventory item ID format.' }, { status: 400 });
        }

        const token = req.headers.get('authorization')?.split(' ')[1];
        if (!token) return NextResponse.json({ message: 'Authorization token missing.' }, { status: 401 });
        const userPayload = await decrypt(token);
        if (userPayload?.role !== 'manager') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

        const { db } = await connectToDatabase();
        const result = await db.collection('inventoryItems').deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
            return NextResponse.json({ message: 'Inventory item not found.' }, { status: 404 });
        }
        return NextResponse.json({ message: 'Inventory item deleted successfully.' }, { status: 200 });
    } catch (error) {
        console.error(`Failed to delete inventory item ${params.id}:`, error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
