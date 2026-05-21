import { AuditLog, type AuditLogDocument } from '../models/auditLog';

export type InsertAuditLogInput = Omit<AuditLogDocument, 'createdAt'>;

export async function insertAuditLog(input: InsertAuditLogInput): Promise<{ _id: string }> {
  const doc = await AuditLog.create(input);

  return { _id: String(doc._id) };
}
