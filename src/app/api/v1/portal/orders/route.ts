
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { decrypt } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function GET(req: NextRequest) {
    try {
        const token = req.headers.get('authorization')?.split(' ')[1];
        if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        const user = await decrypt(token);

        const { db } = await connectToDatabase();

        let match: any = {};

        // Strict RBAC for Portal
        if (user.role === 'physician') {
            match.physicianId = new ObjectId(user.userId as string);
        } else if (user.role === 'patient') {
            const patient = await db.collection('patients').findOne({ userId: new ObjectId(user.userId as string) });
            if (!patient) return NextResponse.json([]);
            match.patientId = patient._id;
        } else {
            return NextResponse.json({ message: 'Portal access denied' }, { status: 403 });
        }

        const orders = await db.collection('orders').aggregate([
            { $match: match },
            { $sort: { createdAt: -1 } },
            {
                $lookup: {
                    from: 'patients',
                    localField: 'patientId',
                    foreignField: '_id',
                    as: 'patientInfo'
                }
            },
            { $unwind: '$patientInfo' }
        ]).toArray();

        const clientOrders = orders.map(o => ({
            id: o._id.toHexString(),
            orderId: o.orderId,
            date: o.createdAt,
            status: o.orderStatus,
            patientName: `${o.patientInfo.firstName} ${o.patientInfo.lastName}`,
            tests: o.samples.flatMap((s: any) => s.tests.map((t: any) => t.name)).join(', ')
        }));

        return NextResponse.json(clientOrders);

    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Error' }, { status: 500 });
    }
}
