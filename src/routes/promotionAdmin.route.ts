import type { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth.middleware';
import { catchAsync } from '../utils/catchAsync';
import {
  createAdminContactMethod,
  createAdminFeaturedOption,
  createAdminPartnershipBenefit,
  createAdminPromotionPricingOption,
  createAdminResourceDownloadCategory,
  deleteAdminContactMethod,
  deleteAdminFeaturedOption,
  deleteAdminPartnershipBenefit,
  deleteAdminPromotionPricingOption,
  deleteAdminResourceDownloadCategory,
  listAdminContactMethods,
  listAdminFeaturedOptions,
  listAdminPartnershipBenefits,
  listAdminPromotionPricingOptions,
  listAdminResourceDownloadCategories,
  updateAdminContactMethod,
  updateAdminFeaturedOption,
  updateAdminPartnershipBenefit,
  updateAdminPromotionPricingOption,
  updateAdminResourceDownloadCategory,
} from '../controllers/promotion/promotionAdmin.controller';
import {
  createContactMethodBodySchema,
  createFeaturedOptionBodySchema,
  createPartnershipBenefitBodySchema,
  createPromotionPricingOptionBodySchema,
  createResourceDownloadCategoryBodySchema,
  idParamSchema,
  listPromotionItemsQuerystringSchema,
  updateContactMethodBodySchema,
  updateFeaturedOptionBodySchema,
  updatePartnershipBenefitBodySchema,
  updatePromotionPricingOptionBodySchema,
  updateResourceDownloadCategoryBodySchema,
} from '../controllers/promotion/promotionAdmin.validation';

export async function registerAdminPromotionRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { page?: string; limit?: string; includeInactive?: string } }>(
    '/featured-options',
    { preHandler: authenticate, schema: listPromotionItemsQuerystringSchema },
    catchAsync(listAdminFeaturedOptions)
  );
  app.post<{ Body: Record<string, unknown> }>(
    '/featured-options',
    { preHandler: authenticate, schema: createFeaturedOptionBodySchema },
    catchAsync(createAdminFeaturedOption)
  );
  app.patch<{ Params: { id: string }; Body: Record<string, unknown> }>(
    '/featured-options/:id',
    { preHandler: authenticate, schema: { ...idParamSchema, ...updateFeaturedOptionBodySchema } },
    catchAsync(updateAdminFeaturedOption)
  );
  app.delete<{ Params: { id: string } }>(
    '/featured-options/:id',
    { preHandler: authenticate, schema: idParamSchema },
    catchAsync(deleteAdminFeaturedOption)
  );

  app.get<{ Querystring: { page?: string; limit?: string; includeInactive?: string } }>(
    '/promotion-pricing-options',
    { preHandler: authenticate, schema: listPromotionItemsQuerystringSchema },
    catchAsync(listAdminPromotionPricingOptions)
  );
  app.post<{ Body: Record<string, unknown> }>(
    '/promotion-pricing-options',
    { preHandler: authenticate, schema: createPromotionPricingOptionBodySchema },
    catchAsync(createAdminPromotionPricingOption)
  );
  app.patch<{ Params: { id: string }; Body: Record<string, unknown> }>(
    '/promotion-pricing-options/:id',
    { preHandler: authenticate, schema: { ...idParamSchema, ...updatePromotionPricingOptionBodySchema } },
    catchAsync(updateAdminPromotionPricingOption)
  );
  app.delete<{ Params: { id: string } }>(
    '/promotion-pricing-options/:id',
    { preHandler: authenticate, schema: idParamSchema },
    catchAsync(deleteAdminPromotionPricingOption)
  );

  app.get<{ Querystring: { page?: string; limit?: string; includeInactive?: string } }>(
    '/resource-download-categories',
    { preHandler: authenticate, schema: listPromotionItemsQuerystringSchema },
    catchAsync(listAdminResourceDownloadCategories)
  );
  app.post<{ Body: Record<string, unknown> }>(
    '/resource-download-categories',
    { preHandler: authenticate, schema: createResourceDownloadCategoryBodySchema },
    catchAsync(createAdminResourceDownloadCategory)
  );
  app.patch<{ Params: { id: string }; Body: Record<string, unknown> }>(
    '/resource-download-categories/:id',
    { preHandler: authenticate, schema: { ...idParamSchema, ...updateResourceDownloadCategoryBodySchema } },
    catchAsync(updateAdminResourceDownloadCategory)
  );
  app.delete<{ Params: { id: string } }>(
    '/resource-download-categories/:id',
    { preHandler: authenticate, schema: idParamSchema },
    catchAsync(deleteAdminResourceDownloadCategory)
  );

  app.get<{ Querystring: { page?: string; limit?: string; includeInactive?: string } }>(
    '/contact-methods',
    { preHandler: authenticate, schema: listPromotionItemsQuerystringSchema },
    catchAsync(listAdminContactMethods)
  );
  app.post<{ Body: Record<string, unknown> }>(
    '/contact-methods',
    { preHandler: authenticate, schema: createContactMethodBodySchema },
    catchAsync(createAdminContactMethod)
  );
  app.patch<{ Params: { id: string }; Body: Record<string, unknown> }>(
    '/contact-methods/:id',
    { preHandler: authenticate, schema: { ...idParamSchema, ...updateContactMethodBodySchema } },
    catchAsync(updateAdminContactMethod)
  );
  app.delete<{ Params: { id: string } }>(
    '/contact-methods/:id',
    { preHandler: authenticate, schema: idParamSchema },
    catchAsync(deleteAdminContactMethod)
  );

  app.get<{ Querystring: { page?: string; limit?: string; includeInactive?: string } }>(
    '/partnership-benefits',
    { preHandler: authenticate, schema: listPromotionItemsQuerystringSchema },
    catchAsync(listAdminPartnershipBenefits)
  );
  app.post<{ Body: Record<string, unknown> }>(
    '/partnership-benefits',
    { preHandler: authenticate, schema: createPartnershipBenefitBodySchema },
    catchAsync(createAdminPartnershipBenefit)
  );
  app.patch<{ Params: { id: string }; Body: Record<string, unknown> }>(
    '/partnership-benefits/:id',
    { preHandler: authenticate, schema: { ...idParamSchema, ...updatePartnershipBenefitBodySchema } },
    catchAsync(updateAdminPartnershipBenefit)
  );
  app.delete<{ Params: { id: string } }>(
    '/partnership-benefits/:id',
    { preHandler: authenticate, schema: idParamSchema },
    catchAsync(deleteAdminPartnershipBenefit)
  );
}
