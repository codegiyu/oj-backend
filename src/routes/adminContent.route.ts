import type { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth.middleware';
import { catchAsync } from '../utils/catchAsync';
import {
  answerPrayerRequestBodySchema,
  assignPastorBodySchema,
  closePollBodySchema,
  createUpdateBodySchema,
  idParamSchema,
  listAdminQuerystringSchema,
  listAdminQuerystringWithVendorSchema,
  rejectBodySchema,
} from '../controllers/admin/adminContent.validation';

import {
  listAdminMusic,
  getAdminMusic,
  createAdminMusic,
  updateAdminMusic,
  deleteAdminMusic,
  approveAdminMusic,
  rejectAdminMusic,
} from '../controllers/admin/musicAdmin.controller';

import {
  listAdminVideos,
  getAdminVideo,
  createAdminVideo,
  updateAdminVideo,
  deleteAdminVideo,
  approveAdminVideo,
  rejectAdminVideo,
} from '../controllers/admin/videoAdmin.controller';

import {
  listAdminNews,
  getAdminNews,
  createAdminNews,
  updateAdminNews,
  deleteAdminNews,
} from '../controllers/admin/newsAdmin.controller';

import {
  listAdminDevotionals,
  getAdminDevotional,
  createAdminDevotional,
  updateAdminDevotional,
  deleteAdminDevotional,
  approveAdminDevotional,
  rejectAdminDevotional,
} from '../controllers/admin/devotionalAdmin.controller';

import {
  listAdminTestimonies,
  getAdminTestimony,
  createAdminTestimony,
  updateAdminTestimony,
  deleteAdminTestimony,
  approveAdminTestimony,
  rejectAdminTestimony,
} from '../controllers/admin/testimonyAdmin.controller';

import {
  listAdminPrayerRequests,
  getAdminPrayerRequest,
  createAdminPrayerRequest,
  updateAdminPrayerRequest,
  deleteAdminPrayerRequest,
  answerAdminPrayerRequest,
} from '../controllers/admin/prayerRequestAdmin.controller';

import {
  listAdminAskPastor,
  getAdminAskPastor,
  updateAdminAskPastor,
  deleteAdminAskPastor,
  assignPastorAdminAskPastor,
  rejectAdminAskPastor,
} from '../controllers/admin/askPastorAdmin.controller';

import {
  listAdminPolls,
  getAdminPoll,
  createAdminPoll,
  updateAdminPoll,
  deleteAdminPoll,
  openAdminPoll,
  closeAdminPoll,
} from '../controllers/admin/pollAdmin.controller';

import {
  listAdminArtists,
  getAdminArtist,
  createAdminArtist,
  updateAdminArtist,
  deleteAdminArtist,
} from '../controllers/admin/artistAdmin.controller';

import {
  listAdminResources,
  getAdminResource,
  createAdminResource,
  updateAdminResource,
  deleteAdminResource,
  approveAdminResource,
  rejectAdminResource,
} from '../controllers/admin/resourceAdmin.controller';

import {
  listAdminPastors,
  getAdminPastor,
  createAdminPastor,
  updateAdminPastor,
  deleteAdminPastor,
} from '../controllers/admin/pastorAdmin.controller';

import {
  listAdminVendors,
  getAdminVendor,
  createAdminVendor,
  updateAdminVendor,
  approveAdminVendor,
  rejectAdminVendor,
} from '../controllers/admin/vendorAdmin.controller';

import {
  listAdminProducts,
  getAdminProduct,
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct,
  approveAdminProduct,
  rejectAdminProduct,
} from '../controllers/admin/productAdmin.controller';

import {
  listAdminOrders,
  getAdminOrder,
} from '../controllers/admin/orderAdmin.controller';

const opts = { preHandler: authenticate };

export async function registerAdminContentRoutes(app: FastifyInstance): Promise<void> {
  // Music
  app.get('/music', { ...opts, schema: listAdminQuerystringSchema }, catchAsync(listAdminMusic));
  app.post('/music', { ...opts, schema: createUpdateBodySchema }, catchAsync(createAdminMusic));
  app.get('/music/:id', { ...opts, schema: idParamSchema }, catchAsync(getAdminMusic));
  app.patch('/music/:id', { ...opts, schema: { ...idParamSchema, ...createUpdateBodySchema } }, catchAsync(updateAdminMusic));
  app.delete('/music/:id', { ...opts, schema: idParamSchema }, catchAsync(deleteAdminMusic));
  app.post('/music/:id/approve', { ...opts, schema: idParamSchema }, catchAsync(approveAdminMusic));
  app.post('/music/:id/reject', { ...opts, schema: { ...idParamSchema, ...rejectBodySchema } }, catchAsync(rejectAdminMusic));

  // Videos
  app.get('/videos', { ...opts, schema: listAdminQuerystringSchema }, catchAsync(listAdminVideos));
  app.post('/videos', { ...opts, schema: createUpdateBodySchema }, catchAsync(createAdminVideo));
  app.get('/videos/:id', { ...opts, schema: idParamSchema }, catchAsync(getAdminVideo));
  app.patch('/videos/:id', { ...opts, schema: { ...idParamSchema, ...createUpdateBodySchema } }, catchAsync(updateAdminVideo));
  app.delete('/videos/:id', { ...opts, schema: idParamSchema }, catchAsync(deleteAdminVideo));
  app.post('/videos/:id/approve', { ...opts, schema: idParamSchema }, catchAsync(approveAdminVideo));
  app.post('/videos/:id/reject', { ...opts, schema: { ...idParamSchema, ...rejectBodySchema } }, catchAsync(rejectAdminVideo));

  // News
  app.get('/news', { ...opts, schema: listAdminQuerystringSchema }, catchAsync(listAdminNews));
  app.post('/news', { ...opts, schema: createUpdateBodySchema }, catchAsync(createAdminNews));
  app.get('/news/:id', { ...opts, schema: idParamSchema }, catchAsync(getAdminNews));
  app.patch('/news/:id', { ...opts, schema: { ...idParamSchema, ...createUpdateBodySchema } }, catchAsync(updateAdminNews));
  app.delete('/news/:id', { ...opts, schema: idParamSchema }, catchAsync(deleteAdminNews));

  // Devotionals
  app.get('/devotionals', { ...opts, schema: listAdminQuerystringSchema }, catchAsync(listAdminDevotionals));
  app.post('/devotionals', { ...opts, schema: createUpdateBodySchema }, catchAsync(createAdminDevotional));
  app.get('/devotionals/:id', { ...opts, schema: idParamSchema }, catchAsync(getAdminDevotional));
  app.patch('/devotionals/:id', { ...opts, schema: { ...idParamSchema, ...createUpdateBodySchema } }, catchAsync(updateAdminDevotional));
  app.delete('/devotionals/:id', { ...opts, schema: idParamSchema }, catchAsync(deleteAdminDevotional));
  app.post('/devotionals/:id/approve', { ...opts, schema: idParamSchema }, catchAsync(approveAdminDevotional));
  app.post('/devotionals/:id/reject', { ...opts, schema: { ...idParamSchema, ...rejectBodySchema } }, catchAsync(rejectAdminDevotional));

  // Testimonies
  app.get('/testimonies', { ...opts, schema: listAdminQuerystringSchema }, catchAsync(listAdminTestimonies));
  app.post('/testimonies', { ...opts, schema: createUpdateBodySchema }, catchAsync(createAdminTestimony));
  app.get('/testimonies/:id', { ...opts, schema: idParamSchema }, catchAsync(getAdminTestimony));
  app.patch('/testimonies/:id', { ...opts, schema: { ...idParamSchema, ...createUpdateBodySchema } }, catchAsync(updateAdminTestimony));
  app.delete('/testimonies/:id', { ...opts, schema: idParamSchema }, catchAsync(deleteAdminTestimony));
  app.post('/testimonies/:id/approve', { ...opts, schema: idParamSchema }, catchAsync(approveAdminTestimony));
  app.post('/testimonies/:id/reject', { ...opts, schema: { ...idParamSchema, ...rejectBodySchema } }, catchAsync(rejectAdminTestimony));

  // Prayer Requests
  app.get('/prayer-requests', { ...opts, schema: listAdminQuerystringSchema }, catchAsync(listAdminPrayerRequests));
  app.post('/prayer-requests', { ...opts, schema: createUpdateBodySchema }, catchAsync(createAdminPrayerRequest));
  app.get('/prayer-requests/:id', { ...opts, schema: idParamSchema }, catchAsync(getAdminPrayerRequest));
  app.patch('/prayer-requests/:id', { ...opts, schema: { ...idParamSchema, ...createUpdateBodySchema } }, catchAsync(updateAdminPrayerRequest));
  app.delete('/prayer-requests/:id', { ...opts, schema: idParamSchema }, catchAsync(deleteAdminPrayerRequest));
  app.post('/prayer-requests/:id/answer', { ...opts, schema: { ...idParamSchema, ...answerPrayerRequestBodySchema } }, catchAsync(answerAdminPrayerRequest));

  // Ask a Pastor questions
  app.get('/ask-a-pastor/questions', { ...opts, schema: listAdminQuerystringSchema }, catchAsync(listAdminAskPastor));
  app.get('/ask-a-pastor/questions/:id', { ...opts, schema: idParamSchema }, catchAsync(getAdminAskPastor));
  app.patch('/ask-a-pastor/questions/:id', { ...opts, schema: { ...idParamSchema, ...createUpdateBodySchema } }, catchAsync(updateAdminAskPastor));
  app.delete('/ask-a-pastor/questions/:id', { ...opts, schema: idParamSchema }, catchAsync(deleteAdminAskPastor));
  app.post('/ask-a-pastor/questions/:id/assign-pastor', { ...opts, schema: { ...idParamSchema, ...assignPastorBodySchema } }, catchAsync(assignPastorAdminAskPastor));
  app.post('/ask-a-pastor/questions/:id/reject', { ...opts, schema: { ...idParamSchema, ...rejectBodySchema } }, catchAsync(rejectAdminAskPastor));

  // Polls
  app.get('/polls', { ...opts, schema: listAdminQuerystringSchema }, catchAsync(listAdminPolls));
  app.post('/polls', { ...opts, schema: createUpdateBodySchema }, catchAsync(createAdminPoll));
  app.get('/polls/:id', { ...opts, schema: idParamSchema }, catchAsync(getAdminPoll));
  app.patch('/polls/:id', { ...opts, schema: { ...idParamSchema, ...createUpdateBodySchema } }, catchAsync(updateAdminPoll));
  app.delete('/polls/:id', { ...opts, schema: idParamSchema }, catchAsync(deleteAdminPoll));
  app.post('/polls/:id/open', { ...opts, schema: idParamSchema }, catchAsync(openAdminPoll));
  app.post('/polls/:id/close', { ...opts, schema: { ...idParamSchema, ...closePollBodySchema } }, catchAsync(closeAdminPoll));

  // Artists
  app.get('/artists', { ...opts, schema: listAdminQuerystringSchema }, catchAsync(listAdminArtists));
  app.post('/artists', { ...opts, schema: createUpdateBodySchema }, catchAsync(createAdminArtist));
  app.get('/artists/:id', { ...opts, schema: idParamSchema }, catchAsync(getAdminArtist));
  app.patch('/artists/:id', { ...opts, schema: { ...idParamSchema, ...createUpdateBodySchema } }, catchAsync(updateAdminArtist));
  app.delete('/artists/:id', { ...opts, schema: idParamSchema }, catchAsync(deleteAdminArtist));

  // Resources
  app.get('/resources', { ...opts, schema: listAdminQuerystringSchema }, catchAsync(listAdminResources));
  app.post('/resources', { ...opts, schema: createUpdateBodySchema }, catchAsync(createAdminResource));
  app.get('/resources/:id', { ...opts, schema: idParamSchema }, catchAsync(getAdminResource));
  app.patch('/resources/:id', { ...opts, schema: { ...idParamSchema, ...createUpdateBodySchema } }, catchAsync(updateAdminResource));
  app.delete('/resources/:id', { ...opts, schema: idParamSchema }, catchAsync(deleteAdminResource));
  app.post('/resources/:id/approve', { ...opts, schema: idParamSchema }, catchAsync(approveAdminResource));
  app.post('/resources/:id/reject', { ...opts, schema: { ...idParamSchema, ...rejectBodySchema } }, catchAsync(rejectAdminResource));

  // Pastors
  app.get('/pastors', { ...opts, schema: listAdminQuerystringSchema }, catchAsync(listAdminPastors));
  app.post('/pastors', { ...opts, schema: createUpdateBodySchema }, catchAsync(createAdminPastor));
  app.get('/pastors/:id', { ...opts, schema: idParamSchema }, catchAsync(getAdminPastor));
  app.patch('/pastors/:id', { ...opts, schema: { ...idParamSchema, ...createUpdateBodySchema } }, catchAsync(updateAdminPastor));
  app.delete('/pastors/:id', { ...opts, schema: idParamSchema }, catchAsync(deleteAdminPastor));

  // Vendors
  app.get('/vendors', { ...opts, schema: listAdminQuerystringSchema }, catchAsync(listAdminVendors));
  app.post('/vendors', { ...opts, schema: createUpdateBodySchema }, catchAsync(createAdminVendor));
  app.get('/vendors/:id', { ...opts, schema: idParamSchema }, catchAsync(getAdminVendor));
  app.patch('/vendors/:id', { ...opts, schema: { ...idParamSchema, ...createUpdateBodySchema } }, catchAsync(updateAdminVendor));
  app.post('/vendors/:id/approve', { ...opts, schema: idParamSchema }, catchAsync(approveAdminVendor));
  app.post('/vendors/:id/reject', { ...opts, schema: { ...idParamSchema, ...rejectBodySchema } }, catchAsync(rejectAdminVendor));

  // Products
  app.get('/products', { ...opts, schema: listAdminQuerystringWithVendorSchema }, catchAsync(listAdminProducts));
  app.post('/products', { ...opts, schema: createUpdateBodySchema }, catchAsync(createAdminProduct));
  app.get('/products/:id', { ...opts, schema: idParamSchema }, catchAsync(getAdminProduct));
  app.patch('/products/:id', { ...opts, schema: { ...idParamSchema, ...createUpdateBodySchema } }, catchAsync(updateAdminProduct));
  app.delete('/products/:id', { ...opts, schema: idParamSchema }, catchAsync(deleteAdminProduct));
  app.post('/products/:id/approve', { ...opts, schema: idParamSchema }, catchAsync(approveAdminProduct));
  app.post('/products/:id/reject', { ...opts, schema: { ...idParamSchema, ...rejectBodySchema } }, catchAsync(rejectAdminProduct));

  // Orders (read-only)
  app.get('/orders', { ...opts, schema: listAdminQuerystringWithVendorSchema }, catchAsync(listAdminOrders));
  app.get('/orders/:id', { ...opts, schema: idParamSchema }, catchAsync(getAdminOrder));
}
