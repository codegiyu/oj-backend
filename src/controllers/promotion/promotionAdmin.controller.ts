import type { FastifyReply, FastifyRequest } from 'fastify';
import mongoose from 'mongoose';
import type { Model } from 'mongoose';
import { sendResponse } from '../../utils/response';
import { AppError } from '../../utils/AppError';
import { parsePositiveInteger } from '../../utils/helpers';
import { FeaturedOption } from '../../models/featuredOption';
import { PromotionPricingOption } from '../../models/promotionPricingOption';
import { ResourceDownloadCategory } from '../../models/resourceDownloadCategory';
import { ContactMethod } from '../../models/contactMethod';
import { PartnershipBenefit } from '../../models/partnershipBenefit';

type ListQuery = { page?: string; limit?: string; includeInactive?: string };
type IdParams = { id: string };

function toObjectId(id: string): mongoose.Types.ObjectId {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new AppError('Invalid id', 400);
  return new mongoose.Types.ObjectId(id);
}

async function listWithPagination(
  model: Model<unknown>,
  request: FastifyRequest<{ Querystring: ListQuery }>,
  projection: string
): Promise<{ items: unknown[]; pagination: Record<string, number> }> {
  const limit = parsePositiveInteger(request.query.limit, 20, 100);
  const page = parsePositiveInteger(request.query.page, 1, 1000);
  const skip = (page - 1) * limit;
  const includeInactive = request.query.includeInactive === 'true';
  const filter = includeInactive ? {} : { isActive: true };

  const [items, total] = await Promise.all([
    model
      .find(filter)
      .sort({ displayOrder: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select(projection)
      .lean(),
    model.countDocuments(filter),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
  };
}

async function updateByIdOrThrow(
  model: Model<unknown>,
  id: string,
  update: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const updated = await model
    .findByIdAndUpdate(toObjectId(id), update, { new: true, runValidators: true })
    .lean<Record<string, unknown> | null>();
  if (!updated) throw new AppError('Item not found', 404);
  return updated;
}

async function softDeleteByIdOrThrow(model: Model<unknown>, id: string): Promise<void> {
  const deleted = await model
    .findByIdAndUpdate(toObjectId(id), { isActive: false }, { new: true, runValidators: true })
    .select('_id')
    .lean();
  if (!deleted) throw new AppError('Item not found', 404);
}

export async function listAdminFeaturedOptions(
  request: FastifyRequest<{ Querystring: ListQuery }>,
  reply: FastifyReply
): Promise<void> {
  const { items, pagination } = await listWithPagination(
    FeaturedOption,
    request,
    '_id title duration price description features icon displayOrder isActive createdAt updatedAt'
  );
  sendResponse(reply, 200, { featuredOptions: items, pagination }, 'Featured options loaded.');
}

export async function createAdminFeaturedOption(
  request: FastifyRequest<{ Body: Record<string, unknown> }>,
  reply: FastifyReply
): Promise<void> {
  const featuredOption = await FeaturedOption.create(request.body);
  sendResponse(reply, 201, { featuredOption: featuredOption.toObject() }, 'Featured option created.');
}

export async function updateAdminFeaturedOption(
  request: FastifyRequest<{ Params: IdParams; Body: Record<string, unknown> }>,
  reply: FastifyReply
): Promise<void> {
  const featuredOption = await updateByIdOrThrow(FeaturedOption, request.params.id, request.body);
  sendResponse(reply, 200, { featuredOption }, 'Featured option updated.');
}

export async function deleteAdminFeaturedOption(
  request: FastifyRequest<{ Params: IdParams }>,
  reply: FastifyReply
): Promise<void> {
  await softDeleteByIdOrThrow(FeaturedOption, request.params.id);
  sendResponse(reply, 200, null, 'Featured option deleted.');
}

export async function listAdminPromotionPricingOptions(
  request: FastifyRequest<{ Querystring: ListQuery }>,
  reply: FastifyReply
): Promise<void> {
  const { items, pagination } = await listWithPagination(
    PromotionPricingOption,
    request,
    '_id title price description features isFeatured displayOrder isActive createdAt updatedAt'
  );
  sendResponse(reply, 200, { pricingOptions: items, pagination }, 'Promotion pricing options loaded.');
}

export async function createAdminPromotionPricingOption(
  request: FastifyRequest<{ Body: Record<string, unknown> }>,
  reply: FastifyReply
): Promise<void> {
  const pricingOption = await PromotionPricingOption.create(request.body);
  sendResponse(reply, 201, { pricingOption: pricingOption.toObject() }, 'Promotion pricing option created.');
}

export async function updateAdminPromotionPricingOption(
  request: FastifyRequest<{ Params: IdParams; Body: Record<string, unknown> }>,
  reply: FastifyReply
): Promise<void> {
  const pricingOption = await updateByIdOrThrow(PromotionPricingOption, request.params.id, request.body);
  sendResponse(reply, 200, { pricingOption }, 'Promotion pricing option updated.');
}

export async function deleteAdminPromotionPricingOption(
  request: FastifyRequest<{ Params: IdParams }>,
  reply: FastifyReply
): Promise<void> {
  await softDeleteByIdOrThrow(PromotionPricingOption, request.params.id);
  sendResponse(reply, 200, null, 'Promotion pricing option deleted.');
}

export async function listAdminResourceDownloadCategories(
  request: FastifyRequest<{ Querystring: ListQuery }>,
  reply: FastifyReply
): Promise<void> {
  const { items, pagination } = await listWithPagination(
    ResourceDownloadCategory,
    request,
    '_id title count description icon href displayOrder isActive createdAt updatedAt'
  );
  sendResponse(reply, 200, { downloadCategories: items, pagination }, 'Resource download categories loaded.');
}

export async function createAdminResourceDownloadCategory(
  request: FastifyRequest<{ Body: Record<string, unknown> }>,
  reply: FastifyReply
): Promise<void> {
  const downloadCategory = await ResourceDownloadCategory.create(request.body);
  sendResponse(reply, 201, { downloadCategory: downloadCategory.toObject() }, 'Resource download category created.');
}

export async function updateAdminResourceDownloadCategory(
  request: FastifyRequest<{ Params: IdParams; Body: Record<string, unknown> }>,
  reply: FastifyReply
): Promise<void> {
  const downloadCategory = await updateByIdOrThrow(ResourceDownloadCategory, request.params.id, request.body);
  sendResponse(reply, 200, { downloadCategory }, 'Resource download category updated.');
}

export async function deleteAdminResourceDownloadCategory(
  request: FastifyRequest<{ Params: IdParams }>,
  reply: FastifyReply
): Promise<void> {
  await softDeleteByIdOrThrow(ResourceDownloadCategory, request.params.id);
  sendResponse(reply, 200, null, 'Resource download category deleted.');
}

export async function listAdminContactMethods(
  request: FastifyRequest<{ Querystring: ListQuery }>,
  reply: FastifyReply
): Promise<void> {
  const { items, pagination } = await listWithPagination(
    ContactMethod,
    request,
    '_id method value action icon displayOrder isActive createdAt updatedAt'
  );
  sendResponse(reply, 200, { contactMethods: items, pagination }, 'Contact methods loaded.');
}

export async function createAdminContactMethod(
  request: FastifyRequest<{ Body: Record<string, unknown> }>,
  reply: FastifyReply
): Promise<void> {
  const contactMethod = await ContactMethod.create(request.body);
  sendResponse(reply, 201, { contactMethod: contactMethod.toObject() }, 'Contact method created.');
}

export async function updateAdminContactMethod(
  request: FastifyRequest<{ Params: IdParams; Body: Record<string, unknown> }>,
  reply: FastifyReply
): Promise<void> {
  const contactMethod = await updateByIdOrThrow(ContactMethod, request.params.id, request.body);
  sendResponse(reply, 200, { contactMethod }, 'Contact method updated.');
}

export async function deleteAdminContactMethod(
  request: FastifyRequest<{ Params: IdParams }>,
  reply: FastifyReply
): Promise<void> {
  await softDeleteByIdOrThrow(ContactMethod, request.params.id);
  sendResponse(reply, 200, null, 'Contact method deleted.');
}

export async function listAdminPartnershipBenefits(
  request: FastifyRequest<{ Querystring: ListQuery }>,
  reply: FastifyReply
): Promise<void> {
  const { items, pagination } = await listWithPagination(
    PartnershipBenefit,
    request,
    '_id text displayOrder isActive createdAt updatedAt'
  );
  sendResponse(reply, 200, { partnershipBenefits: items, pagination }, 'Partnership benefits loaded.');
}

export async function createAdminPartnershipBenefit(
  request: FastifyRequest<{ Body: Record<string, unknown> }>,
  reply: FastifyReply
): Promise<void> {
  const partnershipBenefit = await PartnershipBenefit.create(request.body);
  sendResponse(
    reply,
    201,
    { partnershipBenefit: partnershipBenefit.toObject() },
    'Partnership benefit created.'
  );
}

export async function updateAdminPartnershipBenefit(
  request: FastifyRequest<{ Params: IdParams; Body: Record<string, unknown> }>,
  reply: FastifyReply
): Promise<void> {
  const partnershipBenefit = await updateByIdOrThrow(PartnershipBenefit, request.params.id, request.body);
  sendResponse(reply, 200, { partnershipBenefit }, 'Partnership benefit updated.');
}

export async function deleteAdminPartnershipBenefit(
  request: FastifyRequest<{ Params: IdParams }>,
  reply: FastifyReply
): Promise<void> {
  await softDeleteByIdOrThrow(PartnershipBenefit, request.params.id);
  sendResponse(reply, 200, null, 'Partnership benefit deleted.');
}
