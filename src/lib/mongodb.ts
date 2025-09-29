import { MongoClient, Db } from 'mongodb';
import { seedDatabase } from '@/lib/seed-db';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env');
}

if (!MONGODB_DB) {
  throw new Error('Please define the MONGODB_DB environment variable inside .env');
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections from growing exponentially
 * during API Route usage.
 */
let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

// A global promise to ensure seeding is only attempted once.
let seedingPromise: Promise<void> | null = null;

export async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  // If seeding isn't already in progress, start it.
  if (!seedingPromise) {
    seedingPromise = seedDatabase().catch(err => {
      console.error('Database seeding failed:', err);
      // Prevent future attempts if it fails catastrophically
      // You might want a more sophisticated retry logic here
      process.exit(1); 
    });
  }
  
  // Wait for the seeding to complete before returning the connection
  await seedingPromise;

  const client = new MongoClient(MONGODB_URI!);
  await client.connect();

  const db = client.db(MONGODB_DB);

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}
