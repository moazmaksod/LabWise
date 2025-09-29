
import { connectToDatabase } from '@/lib/mongodb';

type Counter = {
  _id: string;
  sequence_value: number;
};

export async function getNextSequenceValue(sequenceName: string): Promise<number> {
  const { db } = await connectToDatabase();
  const sequenceDocument = await db.collection<Counter>('counters').findOneAndUpdate(
    { _id: sequenceName },
    { $inc: { sequence_value: 1 } },
    { returnDocument: 'after', upsert: true }
  );

  // If the sequence is new, it will be created with sequence_value 1, but findOneAndUpdate might return null on the first upsert.
  const nextValue = sequenceDocument?.sequence_value || 1;
  return nextValue;
}

export async function getNextMrn(): Promise<string> {
    const nextValue = await getNextSequenceValue('patientMrn');
    return `P${String(nextValue).padStart(7, '0')}`;
}

export async function getNextOrderId(): Promise<string> {
    const year = new Date().getFullYear();
    const nextValue = await getNextSequenceValue(`orderId_${year}`);
    return `ORD-${year}-${String(nextValue).padStart(7, '0')}`;
}
