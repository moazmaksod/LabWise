import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET() {
  try {
    const { db } = await connectToDatabase();
    
    // 1. Ping the database to confirm the connection is alive
    const pingResult = await db.admin().ping();
    if (pingResult.ok !== 1) {
        throw new Error('Database ping failed.');
    }

    // 2. Check if the user seeding has worked
    const usersCollection = db.collection('users');
    const userCount = await usersCollection.countDocuments();

    const isSeeded = userCount > 0;

    return NextResponse.json({
      status: 'success',
      message: 'Successfully connected to MongoDB and database is responsive.',
      seedingStatus: isSeeded ? `Success: Found ${userCount} users in the '${db.databaseName}' database.` : `Warning: The '${db.databaseName}' database is connected but the 'users' collection is empty. Seeding may not have run.`,
      userCount: userCount,
    });

  } catch (error: any) {
    console.error('Database connection test failed:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to connect to the database.',
        errorDetails: error.message,
        troubleshooting: [
          '1. Ensure your MongoDB server is running.',
          '2. Verify that the MONGODB_URI and MONGODB_DB environment variables in your .env file are correct.',
          '3. Check your network/firewall settings to ensure the application can reach the database server.',
        ],
      },
      { status: 500 }
    );
  }
}
