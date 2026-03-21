import type { FastifyReply, FastifyRequest } from 'fastify';
import { sendResponse } from '../../utils/response';
import { FeaturedOption } from '../../models/featuredOption';
import { PromotionPricingOption } from '../../models/promotionPricingOption';
import { ResourceDownloadCategory } from '../../models/resourceDownloadCategory';
import { ContactMethod } from '../../models/contactMethod';
import { PartnershipBenefit } from '../../models/partnershipBenefit';

export async function listFeaturedOptions(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const featuredOptions = await FeaturedOption.find({ isActive: true })
    .sort({ displayOrder: 1, createdAt: 1 })
    .select('_id title duration price description features icon displayOrder')
    .lean();

  sendResponse(reply, 200, { featuredOptions }, 'Featured options loaded.');
}

export async function listPromotionPricingOptions(
  _request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const pricingOptions = await PromotionPricingOption.find({ isActive: true })
    .sort({ displayOrder: 1, createdAt: 1 })
    .select('_id title price description features isFeatured displayOrder')
    .lean();

  sendResponse(reply, 200, { pricingOptions }, 'Promotion pricing options loaded.');
}

export async function listResourceDownloadCategories(
  _request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const downloadCategories = await ResourceDownloadCategory.find({ isActive: true })
    .sort({ displayOrder: 1, createdAt: 1 })
    .select('_id title count description icon href displayOrder')
    .lean();

  sendResponse(reply, 200, { downloadCategories }, 'Resource download categories loaded.');
}

export async function getPromotionContact(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const [contactMethods, partnershipBenefitsDocs] = await Promise.all([
    ContactMethod.find({ isActive: true })
      .sort({ displayOrder: 1, createdAt: 1 })
      .select('_id method value action icon displayOrder')
      .lean(),
    PartnershipBenefit.find({ isActive: true })
      .sort({ displayOrder: 1, createdAt: 1 })
      .select('text')
      .lean(),
  ]);

  const partnershipBenefits = partnershipBenefitsDocs.map((item) => item.text);

  sendResponse(
    reply,
    200,
    {
      contactMethods,
      partnershipBenefits,
      additionalContact: '+234 707 324 4801',
    },
    'Promotion contact loaded.'
  );
}
