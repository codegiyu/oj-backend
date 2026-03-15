import { FastifyRequest, FastifyReply } from 'fastify';
import { SiteSettings } from '../../models/siteSettings';
import { getAuthUser } from '../../utils/getAuthUser';
import { AppError } from '../../utils/AppError';
import type { SiteSettingsSlice } from './siteSettings.validation';

const SLICES: SiteSettingsSlice[] = [
  'appDetails',
  'seo',
  'legal',
  'email',
  'features',
  'analytics',
  'localization',
  'branding',
  'contactInfo',
  'socials',
];

async function getSettingsDoc() {
  let doc = await SiteSettings.findOne();
  if (!doc) {
    doc = await SiteSettings.create({ name: 'settings' });
  }
  return doc;
}

export async function getSiteSettings(
  request: FastifyRequest<{ Params: { slice?: string } }>,
  reply: FastifyReply
): Promise<void> {
  const slice = (request.params.slice ?? 'all') as SiteSettingsSlice;
  const settings = await getSettingsDoc();
  const plain = settings.toObject() as Record<string, unknown>;

  if (slice === 'all') {
    await reply.status(200).send(plain);
    return;
  }

  if (!SLICES.includes(slice)) {
    throw new AppError(`Invalid slice: ${slice}`, 400);
  }

  const value = plain[slice];
  if (value === undefined) {
    throw new AppError(`Slice not found: ${slice}`, 404);
  }
  await reply.status(200).send(value);
}

interface UpdateSiteSettingsBody {
  settingsPayload: Array<{ name: SiteSettingsSlice; value: Record<string, unknown> }>;
}

export async function updateSiteSettings(
  request: FastifyRequest<{ Body: UpdateSiteSettingsBody }>,
  reply: FastifyReply
): Promise<void> {
  const user = getAuthUser(request);
  if (!user || user.scope !== 'console-access') {
    throw new AppError('Forbidden', 403);
  }

  const { settingsPayload } = request.body;
  if (!Array.isArray(settingsPayload) || settingsPayload.length === 0) {
    throw new AppError('settingsPayload must be a non-empty array', 400);
  }

  const settings = await getSettingsDoc();

  for (const item of settingsPayload) {
    if (item.name === 'all' || !SLICES.includes(item.name)) continue;
    (settings as Record<string, unknown>)[item.name] = item.value;
  }

  await settings.save();
  const plain = settings.toObject() as Record<string, unknown>;
  await reply.status(200).send(plain);
}
