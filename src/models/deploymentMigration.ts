import { Schema, model } from 'mongoose';

export type DeploymentMigrationStatus = 'running' | 'completed' | 'failed';

export interface ModelDeploymentMigration {
  name: string;
  status: DeploymentMigrationStatus;
  stats?: Record<string, unknown>;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
}

const deploymentMigrationSchema = new Schema<ModelDeploymentMigration>(
  {
    name: { type: String, required: true, unique: true, trim: true, index: true },
    status: {
      type: String,
      enum: ['running', 'completed', 'failed'],
      required: true,
      index: true,
    },
    stats: { type: Schema.Types.Mixed, default: null },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
    errorMessage: { type: String, default: '' },
  },
  { timestamps: true, collection: 'deploymentmigrations' }
);

export const DeploymentMigration = model<ModelDeploymentMigration>(
  'DeploymentMigration',
  deploymentMigrationSchema
);
