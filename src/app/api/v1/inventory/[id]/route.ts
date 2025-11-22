
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { id } = params;
        const body = await req.json();

        if (!ObjectId.isValid(id)) return NextResponse.json({ message: 'Invalid ID' }, { status: 400 });

        const { db } = await connectToDatabase();

        const updateData = { ...body, updatedAt: new Date() };
        delete updateData._id; // Protect ID

        // Handle number conversion if coming from form
        if (updateData.quantityOnHand) updateData.quantityOnHand = parseInt(updateData.quantityOnHand);
        if (updateData.minStockLevel) updateData.minStockLevel = parseInt(updateData.minStockLevel);

        const result = await db.collection('inventoryItems').updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );

        if (result.matchedCount === 0) return NextResponse.json({ message: 'Not found' }, { status: 404 });

        return NextResponse.json({ message: 'Updated successfully' });
    } catch (error) {
        return NextResponse.json({ message: 'Error' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { id } = params;
        if (!ObjectId.isValid(id)) return NextResponse.json({ message: 'Invalid ID' }, { status: 400 });

        const { db } = await connectToDatabase();
        const result = await db.collection('inventoryItems').deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) return NextResponse.json({ message: 'Not found' }, { status: 404 });

        return NextResponse.json({ message: 'Deleted successfully' });
    } catch (error) {
        return NextResponse.json({ message: 'Error' }, { status: 500 });
    }
}
