import mongoose from 'mongoose';
import { AppError } from './AppError';

export function parseNullableObjectId(
  value: string | null | undefined,
  field: string
): mongoose.Types.ObjectId | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new AppError(`Invalid ${field}`, 400);
  }

  return new mongoose.Types.ObjectId(value);
}
