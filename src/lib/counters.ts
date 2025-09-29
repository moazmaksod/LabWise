
import { connectToDatabase } from '@/lib/mongodb';

type Counter = {
  _id: string;
  sequence_value: number;
};

export async function getNextSequence(sequenceName: string): Promise<string> {
  const { db } = await connectToDatabase();
  const sequenceDocument = await db.collection<Counter>('counters').findOneAndUpdate(
    { _id: sequenceName },
    { $inc: { sequence_value: 1 } },
    { returnDocument: 'after', upsert: true }
  );

  // If the sequence is new, it will be created with sequence_value 1, but findOneAndUpdate might return null on the first upsert.
  // Let's ensure we have a value. If it's null, it means it was just created and the value is 1.
  // A more robust check for production might be needed, but this works for initial setup.
  const nextValue = sequenceDocument?.sequence_value || 1;
  
  // Pad the number to make it a fixed length, e.g., 'P0000001'
  return `P${String(nextValue).padStart(7, '0')}`;
}
