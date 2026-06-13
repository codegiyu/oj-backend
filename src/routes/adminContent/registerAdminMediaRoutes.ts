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
  rejectBodySchema,
} from '../../controllers/admin/adminContent.validation';
import {
  listAdminMusic,
  getAdminMusic,
  createAdminMusic,
  updateAdminMusic,
  deleteAdminMusic,
  approveAdminMusic,
  rejectAdminMusic,
} from '../../controllers/admin/musicAdmin.controller';
import {
  listAdminAlbums,
  getAdminAlbum,
  createAdminAlbum,
  updateAdminAlbum,
  deleteAdminAlbum,
} from '../../controllers/admin/albumAdmin.controller';
import {
  listAdminVideos,
  getAdminVideo,
  createAdminVideo,
  updateAdminVideo,
  deleteAdminVideo,
  approveAdminVideo,
  rejectAdminVideo,
} from '../../controllers/admin/videoAdmin.controller';
import {
  listAdminNews,
  getAdminNews,
  createAdminNews,
  updateAdminNews,
  deleteAdminNews,
} from '../../controllers/admin/newsAdmin.controller';

export function registerAdminMediaRoutes(app: FastifyInstance): void {
  app.get(
    '/music',
    { ...adminReadRoute, schema: listAdminQuerystringSchema },
    catchAsync(listAdminMusic)
  );
  app.post(
    '/music',
    { ...adminWriteRoute, schema: createUpdateBodySchema },
    catchAsync(createAdminMusic)
  );
  app.get('/music/:id', { ...adminReadRoute, schema: idParamSchema }, catchAsync(getAdminMusic));
  app.patch(
    '/music/:id',
    { ...adminWriteRoute, schema: { ...idParamSchema, ...createUpdateBodySchema } },
    catchAsync(updateAdminMusic)
  );
  app.delete(
    '/music/:id',
    { ...adminDeleteRoute, schema: idParamSchema },
    catchAsync(deleteAdminMusic)
  );
  app.post(
    '/music/:id/approve',
    { ...adminModerateRoute, schema: idParamSchema },
    catchAsync(approveAdminMusic)
  );
  app.post(
    '/music/:id/reject',
    { ...adminModerateRoute, schema: { ...idParamSchema, ...rejectBodySchema } },
    catchAsync(rejectAdminMusic)
  );

  app.get(
    '/albums',
    { ...adminReadRoute, schema: listAdminQuerystringSchema },
    catchAsync(listAdminAlbums)
  );
  app.post(
    '/albums',
    { ...adminWriteRoute, schema: createUpdateBodySchema },
    catchAsync(createAdminAlbum)
  );
  app.get('/albums/:id', { ...adminReadRoute, schema: idParamSchema }, catchAsync(getAdminAlbum));
  app.patch(
    '/albums/:id',
    { ...adminWriteRoute, schema: { ...idParamSchema, ...createUpdateBodySchema } },
    catchAsync(updateAdminAlbum)
  );
  app.delete(
    '/albums/:id',
    { ...adminDeleteRoute, schema: idParamSchema },
    catchAsync(deleteAdminAlbum)
  );

  app.get(
    '/videos',
    { ...adminReadRoute, schema: listAdminQuerystringSchema },
    catchAsync(listAdminVideos)
  );
  app.post(
    '/videos',
    { ...adminWriteRoute, schema: createUpdateBodySchema },
    catchAsync(createAdminVideo)
  );
  app.get('/videos/:id', { ...adminReadRoute, schema: idParamSchema }, catchAsync(getAdminVideo));
  app.patch(
    '/videos/:id',
    { ...adminWriteRoute, schema: { ...idParamSchema, ...createUpdateBodySchema } },
    catchAsync(updateAdminVideo)
  );
  app.delete(
    '/videos/:id',
    { ...adminDeleteRoute, schema: idParamSchema },
    catchAsync(deleteAdminVideo)
  );
  app.post(
    '/videos/:id/approve',
    { ...adminModerateRoute, schema: idParamSchema },
    catchAsync(approveAdminVideo)
  );
  app.post(
    '/videos/:id/reject',
    { ...adminModerateRoute, schema: { ...idParamSchema, ...rejectBodySchema } },
    catchAsync(rejectAdminVideo)
  );

  app.get(
    '/news',
    { ...adminReadRoute, schema: listAdminQuerystringSchema },
    catchAsync(listAdminNews)
  );
  app.post(
    '/news',
    { ...adminWriteRoute, schema: createUpdateBodySchema },
    catchAsync(createAdminNews)
  );
  app.get('/news/:id', { ...adminReadRoute, schema: idParamSchema }, catchAsync(getAdminNews));
  app.patch(
    '/news/:id',
    { ...adminWriteRoute, schema: { ...idParamSchema, ...createUpdateBodySchema } },
    catchAsync(updateAdminNews)
  );
  app.delete(
    '/news/:id',
    { ...adminDeleteRoute, schema: idParamSchema },
    catchAsync(deleteAdminNews)
  );
}
