
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { decrypt } from '@/lib/auth';
import type { InventoryItem } from '@/lib/types';

// This endpoint is designed to be called by a scheduled task (e.g., a cron job).
export async function GET(req: NextRequest) {
    try {
        // In a real production environment, you might use a secret key for authentication
        // instead of a user token for a cron job.
        // const cronSecret = req.headers.get('X-Cron-Secret');
        // if (cronSecret !== process.env.CRON_SECRET) {
        //     return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        // }
        
        const token = req.headers.get('authorization')?.split(' ')[1];
        if (!token) return NextResponse.json({ message: 'Authorization token missing.' }, { status: 401 });
        const userPayload = await decrypt(token);
        if (userPayload?.role !== 'manager') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

        const { db } = await connectToDatabase();

        const lowStockItems = await db.collection<InventoryItem>('inventoryItems').find({
             $expr: { $lte: ['$quantityOnHand', '$minStockLevel'] } 
        }).toArray();

        if (lowStockItems.length === 0) {
            return NextResponse.json({ message: 'Stock levels are sufficient. No alerts sent.' });
        }

        let notificationsSent = 0;
        for (const item of lowStockItems) {
            // Simulate sending an email notification
            console.log(`--- SIMULATING EMAIL NOTIFICATION ---`);
            console.log(`To: Lab Manager <manager@labwise.com>`);
            console.log(`Subject: Low Stock Alert for ${item.itemName}`);
            console.log(`Body:`);
            console.log(`  Item: ${item.itemName} (Lot: ${item.lotNumber})`);
            console.log(`  Current Quantity: ${item.quantityOnHand}`);
            console.log(`  Minimum Stock Level: ${item.minStockLevel}`);
            console.log(`  Please re-order soon.`);
            console.log(`-----------------------------------`);
            notificationsSent++;
        }

        return NextResponse.json({ 
            message: `Processed low stock check. Found ${lowStockItems.length} items below minimum stock.`,
            notificationsSent,
            lowStockItems: lowStockItems.map(item => item.itemName)
        });

    } catch (error) {
        console.error('Failed to execute scheduled stock check:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
