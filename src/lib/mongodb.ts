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
let isSeeded = false;

export async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(MONGODB_URI!);
  await client.connect();

  const db = client.db(MONGODB_DB);

  cachedClient = client;
  cachedDb = db;

  // Run the seed script only once when the first connection is established
  if (!isSeeded) {
    await seedDatabase();
    isSeeded = true;
  }

  return { client, db };
}
