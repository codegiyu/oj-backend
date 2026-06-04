import { SiteSettings } from '../models/siteSettings';
import { AppError } from './AppError';

export type AccountSuspendedPayload = {
  code: 'ACCOUNT_SUSPENDED';
  suspensionReason: string;
  suspensionDate: string | null;
  contactWhatsApp: string | null;
};

export async function getContactWhatsAppFromSettings(): Promise<string | null> {
  const doc = await SiteSettings.findOne().select('contactInfo').lean();
  const whatsapp = (doc as { contactInfo?: { whatsapp?: string } } | null)?.contactInfo?.whatsapp;
  if (!whatsapp?.trim()) return null;
  return whatsapp.trim();
}

export async function throwAccountSuspendedError(user: {
  suspensionReason?: string;
  suspensionDate?: Date | null;
}): Promise<never> {
  const contactWhatsApp = await getContactWhatsAppFromSettings();
  const suspensionDate =
    user.suspensionDate instanceof Date ? user.suspensionDate.toISOString() : null;

  const payload: AccountSuspendedPayload = {
    code: 'ACCOUNT_SUSPENDED',
    suspensionReason: user.suspensionReason?.trim() || 'Your account has been suspended.',
    suspensionDate,
    contactWhatsApp,
  };

  throw new AppError('Your account has been suspended', 403, payload);
}
