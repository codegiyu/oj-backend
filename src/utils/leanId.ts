import mongoose from 'mongoose';

/** Safe id string for lean docs and ObjectIds (satisfies no-base-to-string). */
export function leanIdToString(id: unknown): string {
  if (typeof id === 'string') return id;
  if (id instanceof mongoose.Types.ObjectId) return id.toHexString();
  if (typeof id === 'object' && id !== null && 'toString' in id) {
    const fn = (id as { toString: () => unknown }).toString;
    if (typeof fn === 'function') {
      const s = fn.call(id);
      if (typeof s === 'string' && s.length > 0 && s !== '[object Object]') return s;
    }
  }

  return '';
}
