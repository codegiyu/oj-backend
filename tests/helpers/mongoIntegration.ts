import mongoose from 'mongoose';
import { connectDb, disconnectDb } from '../../src/config/db';

export async function connectTestMongo(): Promise<boolean> {
  if (mongoose.connection.readyState === 1) return true;

  try {
    await connectDb();
    return true;
  } catch {
    return false;
  }
}

export async function disconnectTestMongo(): Promise<void> {
  if (mongoose.connection.readyState === 0) return;
  await disconnectDb();
}

export async function clearCollections(collectionNames: string[]): Promise<void> {
  const db = mongoose.connection.db;
  if (!db) return;

  for (const name of collectionNames) {
    const collections = await db.listCollections({ name }).toArray();
    if (collections.length > 0) {
      await db.collection(name).deleteMany({});
    }
  }
}

export function skipUnlessMongo(connected: boolean): void {
  if (!connected) {
    console.warn('Skipping Mongo integration test — database unavailable.');
  }
}
