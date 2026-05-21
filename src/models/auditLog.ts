import { Schema, model } from 'mongoose';

export type AuditLogDocument = {
  action: string;
  actorId?: string;
  actorEmail?: string;
  actorScope?: string;
  resourceType: string;
  resourceId?: string;
  requestId?: string;
  method: string;
  path: string;
  statusCode: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
};

const auditLogSchema = new Schema<AuditLogDocument>(
  {
    action: { type: String, required: true, index: true },
    actorId: { type: String, default: '' },
    actorEmail: { type: String, default: '' },
    actorScope: { type: String, default: '' },
    resourceType: { type: String, required: true, index: true },
    resourceId: { type: String, default: '' },
    requestId: { type: String, default: '', index: true },
    method: { type: String, required: true },
    path: { type: String, required: true },
    statusCode: { type: Number, required: true },
    metadata: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'audit_logs' }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });

export const AuditLog = model<AuditLogDocument>('AuditLog', auditLogSchema);
