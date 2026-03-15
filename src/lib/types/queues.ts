export const JOB_TYPES = [
  'verificationCode',
  'resetPassword',
  'notificationEmail',
  'inviteAdmin',
] as const;

export type JOB_TYPE = (typeof JOB_TYPES)[number];

interface BaseJobData {
  type: JOB_TYPE;
  priority?: number;
  delay?: number;
}

interface BaseEmailJobData extends BaseJobData {
  to: string;
  name?: string;
  subject?: string;
  /** Set when resending; handler updates this existing log instead of creating new one */
  emailLogId?: string;
}

export interface OTPJobData extends BaseEmailJobData {
  type: 'verificationCode';
  code: string;
  avatar?: string;
}

export interface ResetPasswordJobData extends BaseEmailJobData {
  type: 'resetPassword';
  link: string;
  avatar?: string;
}

export interface NotificationEmailJobData extends BaseEmailJobData {
  type: 'notificationEmail';
  title: string;
  message: string;
  eventType?: string;
  notificationId?: string;
  userModel: 'User' | 'Admin';
}

export interface InviteAdminJobData extends BaseEmailJobData {
  type: 'inviteAdmin';
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  permissions: string[];
  token: string;
  inviteLink: string;
  avatar?: string;
}

export type JobData =
  | OTPJobData
  | ResetPasswordJobData
  | NotificationEmailJobData
  | InviteAdminJobData;
