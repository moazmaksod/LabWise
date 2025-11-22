import { MongoClient, Db } from 'mongodb';
import { seedDatabase } from '@/lib/seed-db';
import { MockClient } from '@/lib/mock-db';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'labwise';

// Helper to determine if we should use mock
const USE_MOCK = !MONGODB_URI || MONGODB_URI.includes('localhost');

let cachedClient: MongoClient | MockClient | null = null;
let cachedDb: Db | any | null = null;

let seedingPromise: Promise<void> | null = null;

export async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  // If seeding isn't already in progress, start it.
  if (!seedingPromise) {
    seedingPromise = seedDatabase().catch(err => {
      console.error('Database seeding failed:', err);
    });
  }
  
  await seedingPromise;

  if (USE_MOCK) {
      console.log("Using In-Memory Mock Database");
      if (!cachedClient) {
          cachedClient = new MockClient();
          cachedDb = cachedClient.db(MONGODB_DB);
      }
  } else {
      const client = new MongoClient(MONGODB_URI!);
      await client.connect();
      const db = client.db(MONGODB_DB);
      cachedClient = client;
      cachedDb = db;
  }

  return { client: cachedClient, db: cachedDb };
}
