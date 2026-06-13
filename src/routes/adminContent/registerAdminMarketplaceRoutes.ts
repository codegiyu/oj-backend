import type { FastifyInstance } from 'fastify';
import {
  adminDeleteRoute,
  adminModerateRoute,
  adminReadRoute,
  adminWriteRoute,
} from '../../utils/adminRouteHandlers';
import { catchAsync } from '../../utils/catchAsync';
import {
  createUpdateBodySchema,
  idParamSchema,
  listAdminQuerystringSchema,
  listAdminQuerystringWithVendorSchema,
  rejectBodySchema,
  updateAdminOrderBodySchema,
} from '../../controllers/admin/adminContent.validation';
import { suspendRoleProfileBodySchema } from '../../controllers/admin/roleProfile.validation';
import {
  listAdminVendors,
  getAdminVendor,
  createAdminVendor,
  updateAdminVendor,
  approveAdminVendor,
  rejectAdminVendor,
} from '../../controllers/admin/vendorAdmin.controller';
import {
  suspendAdminVendor,
  unsuspendAdminVendor,
} from '../../controllers/admin/roleProfileAdmin.controller';
import {
  listAdminProducts,
  getAdminProduct,
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct,
  approveAdminProduct,
  rejectAdminProduct,
} from '../../controllers/admin/productAdmin.controller';
import {
  listAdminOrders,
  getAdminOrder,
  updateAdminOrder,
} from '../../controllers/admin/orderAdmin.controller';

export function registerAdminMarketplaceRoutes(app: FastifyInstance): void {
  app.get(
    '/vendors',
    { ...adminReadRoute, schema: listAdminQuerystringSchema },
    catchAsync(listAdminVendors)
  );
  app.post(
    '/vendors',
    { ...adminWriteRoute, schema: createUpdateBodySchema },
    catchAsync(createAdminVendor)
  );
  app.get('/vendors/:id', { ...adminReadRoute, schema: idParamSchema }, catchAsync(getAdminVendor));
  app.patch(
    '/vendors/:id',
    { ...adminWriteRoute, schema: { ...idParamSchema, ...createUpdateBodySchema } },
    catchAsync(updateAdminVendor)
  );
  app.post(
    '/vendors/:id/approve',
    { ...adminModerateRoute, schema: idParamSchema },
    catchAsync(approveAdminVendor)
  );
  app.post(
    '/vendors/:id/reject',
    { ...adminModerateRoute, schema: { ...idParamSchema, ...rejectBodySchema } },
    catchAsync(rejectAdminVendor)
  );
  app.post(
    '/vendors/:id/suspend',
    { ...adminModerateRoute, schema: { ...idParamSchema, ...suspendRoleProfileBodySchema } },
    catchAsync(suspendAdminVendor)
  );
  app.post(
    '/vendors/:id/unsuspend',
    { ...adminModerateRoute, schema: idParamSchema },
    catchAsync(unsuspendAdminVendor)
  );

  app.get(
    '/products',
    { ...adminReadRoute, schema: listAdminQuerystringWithVendorSchema },
    catchAsync(listAdminProducts)
  );
  app.post(
    '/products',
    { ...adminWriteRoute, schema: createUpdateBodySchema },
    catchAsync(createAdminProduct)
  );
  app.get(
    '/products/:id',
    { ...adminReadRoute, schema: idParamSchema },
    catchAsync(getAdminProduct)
  );
  app.patch(
    '/products/:id',
    { ...adminWriteRoute, schema: { ...idParamSchema, ...createUpdateBodySchema } },
    catchAsync(updateAdminProduct)
  );
  app.delete(
    '/products/:id',
    { ...adminDeleteRoute, schema: idParamSchema },
    catchAsync(deleteAdminProduct)
  );
  app.post(
    '/products/:id/approve',
    { ...adminModerateRoute, schema: idParamSchema },
    catchAsync(approveAdminProduct)
  );
  app.post(
    '/products/:id/reject',
    { ...adminModerateRoute, schema: { ...idParamSchema, ...rejectBodySchema } },
    catchAsync(rejectAdminProduct)
  );

  app.get(
    '/orders',
    { ...adminReadRoute, schema: listAdminQuerystringWithVendorSchema },
    catchAsync(listAdminOrders)
  );
  app.get('/orders/:id', { ...adminReadRoute, schema: idParamSchema }, catchAsync(getAdminOrder));
  app.patch(
    '/orders/:id',
    { ...adminWriteRoute, schema: { ...idParamSchema, ...updateAdminOrderBodySchema } },
    catchAsync(updateAdminOrder)
  );
}
