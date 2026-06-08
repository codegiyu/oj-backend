/* eslint-disable @typescript-eslint/require-await */
import type { FastifyInstance } from 'fastify';
import {
  adminDeleteRoute,
  adminModerateRoute,
  adminReadRoute,
  adminUsersRoute,
  adminWriteRoute,
} from '../utils/adminRouteHandlers';
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
  adminUsersQuerystringSchema,
  adminUserPatchBodySchema,
  updateAdminOrderBodySchema,
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
  listAdminAlbums,
  getAdminAlbum,
  createAdminAlbum,
  updateAdminAlbum,
  deleteAdminAlbum,
} from '../controllers/admin/albumAdmin.controller';

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
  approveAdminPoll,
  rejectAdminPoll,
} from '../controllers/admin/pollAdmin.controller';

import {
  listAdminArtists,
  getAdminArtist,
  createAdminArtist,
  updateAdminArtist,
  deleteAdminArtist,
  getAdminArtistDashboardStats,
} from '../controllers/admin/artistAdmin.controller';

import {
  listOrSearchAdminUsers,
  getAdminUser,
  updateAdminUser,
  approveAdminUserDeletion,
  rejectAdminUserDeletion,
} from '../controllers/admin/userAdmin.controller';

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
  listAdminPastorApplications,
  getAdminPastorApplication,
  approveAdminPastorApplication,
  rejectAdminPastorApplication,
} from '../controllers/admin/pastorApplicationAdmin.controller';

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
  updateAdminOrder,
} from '../controllers/admin/orderAdmin.controller';

import {
  listAdminContentCategories,
  createAdminContentCategory,
  updateAdminContentCategory,
  deleteAdminContentCategory,
} from '../controllers/admin/contentCategoryAdmin.controller';

import {
  listAdminHomeAdverts,
  createAdminHomeAdvert,
  updateAdminHomeAdvert,
  deleteAdminHomeAdvert,
} from '../controllers/admin/homeAdvertAdmin.controller';

import {
  listAdminGospelVerses,
  getAdminGospelVerse,
  createAdminGospelVerse,
  updateAdminGospelVerse,
  deleteAdminGospelVerse,
} from '../controllers/admin/gospelVerseAdmin.controller';
import { registerPrivilegedAuditHook } from '../hooks/privilegedAudit.hook';
import {
  suspendAdminVendor,
  unsuspendAdminVendor,
  suspendAdminArtist,
  unsuspendAdminArtist,
  suspendAdminPastor,
  unsuspendAdminPastor,
  listAdminRoleProfileAppeals,
  acceptAdminRoleProfileAppeal,
  rejectAdminRoleProfileAppeal,
} from '../controllers/admin/roleProfileAdmin.controller';
import {
  suspendRoleProfileBodySchema,
  rejectAppealBodySchema,
} from '../controllers/admin/roleProfile.validation';

export async function registerAdminContentRoutes(app: FastifyInstance): Promise<void> {
  registerPrivilegedAuditHook(app);
  app.get(
    '/users',
    { ...adminUsersRoute, schema: adminUsersQuerystringSchema },
    catchAsync(listOrSearchAdminUsers)
  );
  app.get('/users/:id', { ...adminUsersRoute, schema: idParamSchema }, catchAsync(getAdminUser));
  app.patch(
    '/users/:id',
    { ...adminUsersRoute, schema: { ...idParamSchema, ...adminUserPatchBodySchema } },
    catchAsync(updateAdminUser)
  );
  app.post(
    '/users/:id/approve-deletion',
    { ...adminUsersRoute, schema: idParamSchema },
    catchAsync(approveAdminUserDeletion)
  );
  app.post(
    '/users/:id/reject-deletion',
    { ...adminUsersRoute, schema: idParamSchema },
    catchAsync(rejectAdminUserDeletion)
  );

  app.get('/role-profile-appeals', { ...adminReadRoute }, catchAsync(listAdminRoleProfileAppeals));
  app.post(
    '/role-profile-appeals/:id/accept',
    { ...adminWriteRoute, schema: idParamSchema },
    catchAsync(acceptAdminRoleProfileAppeal)
  );
  app.post(
    '/role-profile-appeals/:id/reject',
    { ...adminModerateRoute, schema: { ...idParamSchema, ...rejectAppealBodySchema } },
    catchAsync(rejectAdminRoleProfileAppeal)
  );

  // Music
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

  // Albums
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

  // Videos
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

  // News
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

  // Devotionals
  app.get(
    '/devotionals',
    { ...adminReadRoute, schema: listAdminQuerystringSchema },
    catchAsync(listAdminDevotionals)
  );
  app.post(
    '/devotionals',
    { ...adminWriteRoute, schema: createUpdateBodySchema },
    catchAsync(createAdminDevotional)
  );
  app.get(
    '/devotionals/:id',
    { ...adminReadRoute, schema: idParamSchema },
    catchAsync(getAdminDevotional)
  );
  app.patch(
    '/devotionals/:id',
    { ...adminWriteRoute, schema: { ...idParamSchema, ...createUpdateBodySchema } },
    catchAsync(updateAdminDevotional)
  );
  app.delete(
    '/devotionals/:id',
    { ...adminDeleteRoute, schema: idParamSchema },
    catchAsync(deleteAdminDevotional)
  );
  app.post(
    '/devotionals/:id/approve',
    { ...adminModerateRoute, schema: idParamSchema },
    catchAsync(approveAdminDevotional)
  );
  app.post(
    '/devotionals/:id/reject',
    { ...adminModerateRoute, schema: { ...idParamSchema, ...rejectBodySchema } },
    catchAsync(rejectAdminDevotional)
  );

  // Testimonies
  app.get(
    '/testimonies',
    { ...adminReadRoute, schema: listAdminQuerystringSchema },
    catchAsync(listAdminTestimonies)
  );
  app.post(
    '/testimonies',
    { ...adminWriteRoute, schema: createUpdateBodySchema },
    catchAsync(createAdminTestimony)
  );
  app.get(
    '/testimonies/:id',
    { ...adminReadRoute, schema: idParamSchema },
    catchAsync(getAdminTestimony)
  );
  app.patch(
    '/testimonies/:id',
    { ...adminWriteRoute, schema: { ...idParamSchema, ...createUpdateBodySchema } },
    catchAsync(updateAdminTestimony)
  );
  app.delete(
    '/testimonies/:id',
    { ...adminDeleteRoute, schema: idParamSchema },
    catchAsync(deleteAdminTestimony)
  );
  app.post(
    '/testimonies/:id/approve',
    { ...adminModerateRoute, schema: idParamSchema },
    catchAsync(approveAdminTestimony)
  );
  app.post(
    '/testimonies/:id/reject',
    { ...adminModerateRoute, schema: { ...idParamSchema, ...rejectBodySchema } },
    catchAsync(rejectAdminTestimony)
  );

  // Prayer Requests
  app.get(
    '/prayer-requests',
    { ...adminReadRoute, schema: listAdminQuerystringSchema },
    catchAsync(listAdminPrayerRequests)
  );
  app.post(
    '/prayer-requests',
    { ...adminWriteRoute, schema: createUpdateBodySchema },
    catchAsync(createAdminPrayerRequest)
  );
  app.get(
    '/prayer-requests/:id',
    { ...adminReadRoute, schema: idParamSchema },
    catchAsync(getAdminPrayerRequest)
  );
  app.patch(
    '/prayer-requests/:id',
    { ...adminWriteRoute, schema: { ...idParamSchema, ...createUpdateBodySchema } },
    catchAsync(updateAdminPrayerRequest)
  );
  app.delete(
    '/prayer-requests/:id',
    { ...adminDeleteRoute, schema: idParamSchema },
    catchAsync(deleteAdminPrayerRequest)
  );
  app.post(
    '/prayer-requests/:id/answer',
    { ...adminWriteRoute, schema: { ...idParamSchema, ...answerPrayerRequestBodySchema } },
    catchAsync(answerAdminPrayerRequest)
  );

  // Ask a Pastor questions
  app.get(
    '/ask-a-pastor/questions',
    { ...adminReadRoute, schema: listAdminQuerystringSchema },
    catchAsync(listAdminAskPastor)
  );
  app.get(
    '/ask-a-pastor/questions/:id',
    { ...adminReadRoute, schema: idParamSchema },
    catchAsync(getAdminAskPastor)
  );
  app.patch(
    '/ask-a-pastor/questions/:id',
    { ...adminWriteRoute, schema: { ...idParamSchema, ...createUpdateBodySchema } },
    catchAsync(updateAdminAskPastor)
  );
  app.delete(
    '/ask-a-pastor/questions/:id',
    { ...adminDeleteRoute, schema: idParamSchema },
    catchAsync(deleteAdminAskPastor)
  );
  app.post(
    '/ask-a-pastor/questions/:id/assign-pastor',
    { ...adminWriteRoute, schema: { ...idParamSchema, ...assignPastorBodySchema } },
    catchAsync(assignPastorAdminAskPastor)
  );
  app.post(
    '/ask-a-pastor/questions/:id/reject',
    { ...adminModerateRoute, schema: { ...idParamSchema, ...rejectBodySchema } },
    catchAsync(rejectAdminAskPastor)
  );

  // Polls
  app.get(
    '/polls',
    { ...adminReadRoute, schema: listAdminQuerystringSchema },
    catchAsync(listAdminPolls)
  );
  app.post(
    '/polls',
    { ...adminWriteRoute, schema: createUpdateBodySchema },
    catchAsync(createAdminPoll)
  );
  app.get('/polls/:id', { ...adminReadRoute, schema: idParamSchema }, catchAsync(getAdminPoll));
  app.patch(
    '/polls/:id',
    { ...adminWriteRoute, schema: { ...idParamSchema, ...createUpdateBodySchema } },
    catchAsync(updateAdminPoll)
  );
  app.delete(
    '/polls/:id',
    { ...adminDeleteRoute, schema: idParamSchema },
    catchAsync(deleteAdminPoll)
  );
  app.post(
    '/polls/:id/open',
    { ...adminModerateRoute, schema: idParamSchema },
    catchAsync(openAdminPoll)
  );
  app.post(
    '/polls/:id/close',
    { ...adminModerateRoute, schema: { ...idParamSchema, ...closePollBodySchema } },
    catchAsync(closeAdminPoll)
  );
  app.post(
    '/polls/:id/approve',
    { ...adminModerateRoute, schema: idParamSchema },
    catchAsync(approveAdminPoll)
  );
  app.post(
    '/polls/:id/reject',
    { ...adminModerateRoute, schema: { ...idParamSchema, ...rejectBodySchema } },
    catchAsync(rejectAdminPoll)
  );

  // Artists
  app.get(
    '/artists',
    { ...adminReadRoute, schema: listAdminQuerystringSchema },
    catchAsync(listAdminArtists)
  );
  app.post(
    '/artists',
    { ...adminWriteRoute, schema: createUpdateBodySchema },
    catchAsync(createAdminArtist)
  );
  app.get(
    '/artists/:id/dashboard-stats',
    { ...adminReadRoute, schema: idParamSchema },
    catchAsync(getAdminArtistDashboardStats)
  );
  app.get('/artists/:id', { ...adminReadRoute, schema: idParamSchema }, catchAsync(getAdminArtist));
  app.patch(
    '/artists/:id',
    { ...adminWriteRoute, schema: { ...idParamSchema, ...createUpdateBodySchema } },
    catchAsync(updateAdminArtist)
  );
  app.delete(
    '/artists/:id',
    { ...adminDeleteRoute, schema: idParamSchema },
    catchAsync(deleteAdminArtist)
  );
  app.post(
    '/artists/:id/suspend',
    { ...adminModerateRoute, schema: { ...idParamSchema, ...suspendRoleProfileBodySchema } },
    catchAsync(suspendAdminArtist)
  );
  app.post(
    '/artists/:id/unsuspend',
    { ...adminModerateRoute, schema: idParamSchema },
    catchAsync(unsuspendAdminArtist)
  );

  // Resources
  app.get(
    '/resources',
    { ...adminReadRoute, schema: listAdminQuerystringSchema },
    catchAsync(listAdminResources)
  );
  app.post(
    '/resources',
    { ...adminWriteRoute, schema: createUpdateBodySchema },
    catchAsync(createAdminResource)
  );
  app.get(
    '/resources/:id',
    { ...adminReadRoute, schema: idParamSchema },
    catchAsync(getAdminResource)
  );
  app.patch(
    '/resources/:id',
    { ...adminWriteRoute, schema: { ...idParamSchema, ...createUpdateBodySchema } },
    catchAsync(updateAdminResource)
  );
  app.delete(
    '/resources/:id',
    { ...adminDeleteRoute, schema: idParamSchema },
    catchAsync(deleteAdminResource)
  );
  app.post(
    '/resources/:id/approve',
    { ...adminModerateRoute, schema: idParamSchema },
    catchAsync(approveAdminResource)
  );
  app.post(
    '/resources/:id/reject',
    { ...adminModerateRoute, schema: { ...idParamSchema, ...rejectBodySchema } },
    catchAsync(rejectAdminResource)
  );

  // Pastors
  app.get(
    '/pastors',
    { ...adminReadRoute, schema: listAdminQuerystringSchema },
    catchAsync(listAdminPastors)
  );
  app.post(
    '/pastors',
    { ...adminWriteRoute, schema: createUpdateBodySchema },
    catchAsync(createAdminPastor)
  );
  app.get('/pastors/:id', { ...adminReadRoute, schema: idParamSchema }, catchAsync(getAdminPastor));
  app.patch(
    '/pastors/:id',
    { ...adminWriteRoute, schema: { ...idParamSchema, ...createUpdateBodySchema } },
    catchAsync(updateAdminPastor)
  );
  app.delete(
    '/pastors/:id',
    { ...adminDeleteRoute, schema: idParamSchema },
    catchAsync(deleteAdminPastor)
  );
  app.post(
    '/pastors/:id/suspend',
    { ...adminModerateRoute, schema: { ...idParamSchema, ...suspendRoleProfileBodySchema } },
    catchAsync(suspendAdminPastor)
  );
  app.post(
    '/pastors/:id/unsuspend',
    { ...adminModerateRoute, schema: idParamSchema },
    catchAsync(unsuspendAdminPastor)
  );

  // Pastor applications
  app.get(
    '/pastor-applications',
    { ...adminReadRoute, schema: listAdminQuerystringSchema },
    catchAsync(listAdminPastorApplications)
  );
  app.get(
    '/pastor-applications/:id',
    { ...adminReadRoute, schema: idParamSchema },
    catchAsync(getAdminPastorApplication)
  );
  app.post(
    '/pastor-applications/:id/approve',
    { ...adminModerateRoute, schema: idParamSchema },
    catchAsync(approveAdminPastorApplication)
  );
  app.post(
    '/pastor-applications/:id/reject',
    { ...adminModerateRoute, schema: { ...idParamSchema, ...rejectBodySchema } },
    catchAsync(rejectAdminPastorApplication)
  );

  // Vendors
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

  // Products
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

  // Content categories (editorial taxonomy)
  app.get(
    '/content-categories',
    { ...adminReadRoute, schema: listAdminQuerystringSchema },
    catchAsync(listAdminContentCategories)
  );
  app.post(
    '/content-categories',
    { ...adminWriteRoute, schema: createUpdateBodySchema },
    catchAsync(createAdminContentCategory)
  );
  app.patch(
    '/content-categories/:id',
    { ...adminWriteRoute, schema: { ...idParamSchema, ...createUpdateBodySchema } },
    catchAsync(updateAdminContentCategory)
  );
  app.delete(
    '/content-categories/:id',
    { ...adminDeleteRoute, schema: idParamSchema },
    catchAsync(deleteAdminContentCategory)
  );

  // Home page banner adverts
  app.get(
    '/home-adverts',
    { ...adminReadRoute, schema: listAdminQuerystringSchema },
    catchAsync(listAdminHomeAdverts)
  );
  app.post(
    '/home-adverts',
    { ...adminWriteRoute, schema: createUpdateBodySchema },
    catchAsync(createAdminHomeAdvert)
  );
  app.patch(
    '/home-adverts/:id',
    { ...adminWriteRoute, schema: { ...idParamSchema, ...createUpdateBodySchema } },
    catchAsync(updateAdminHomeAdvert)
  );
  app.delete(
    '/home-adverts/:id',
    { ...adminDeleteRoute, schema: idParamSchema },
    catchAsync(deleteAdminHomeAdvert)
  );

  // Gospel verses (daily verse schedule)
  app.get(
    '/gospel-verses',
    { ...adminReadRoute, schema: listAdminQuerystringSchema },
    catchAsync(listAdminGospelVerses)
  );
  app.post(
    '/gospel-verses',
    { ...adminWriteRoute, schema: createUpdateBodySchema },
    catchAsync(createAdminGospelVerse)
  );
  app.get(
    '/gospel-verses/:id',
    { ...adminReadRoute, schema: idParamSchema },
    catchAsync(getAdminGospelVerse)
  );
  app.patch(
    '/gospel-verses/:id',
    { ...adminWriteRoute, schema: { ...idParamSchema, ...createUpdateBodySchema } },
    catchAsync(updateAdminGospelVerse)
  );
  app.delete(
    '/gospel-verses/:id',
    { ...adminDeleteRoute, schema: idParamSchema },
    catchAsync(deleteAdminGospelVerse)
  );

  // Orders
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
