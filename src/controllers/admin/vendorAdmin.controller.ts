import { FastifyRequest, FastifyReply } from 'fastify';
import mongoose from 'mongoose';
import { Vendor } from '../../models/vendor';
import { User } from '../../models/user';
import { AppError } from '../../utils/AppError';
import { sendResponse } from '../../utils/response';
import { generateUniqueSlug } from '../../utils/helpers';
import { leanIdToString, requireAdmin, parseObjectId } from './admin.helpers';
import { runAdminList } from '../../services/admin/runAdminListGet';
import { listAdminVendorRows } from '../../repositories/admin/vendor.repository';
import { applyAdminUnlinkedProfileFilter } from './adminListFilters';
import {
  frontendPathsForMarketplaceVendor,
  scheduleFrontendRevalidation,
} from '../../services/frontendRevalidation.service';
import { ensureVendorUserLink } from '../../services/roleProfileLink.service';

const SORT_FIELDS = ['createdAt', 'updatedAt', 'storeName', 'name', 'status'];

function shapeVendorItem(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    _id: raw._id != null ? leanIdToString(raw._id) : raw._id,
    name: raw.name,
    slug: raw.slug,
    email: raw.email,
    phone: raw.phone,
    storeName: raw.storeName,
    storeDescription: raw.storeDescription,
    logo: raw.logo,
    coverImage: raw.coverImage,
    whatsapp: raw.whatsapp,
    address: raw.address,
    status: raw.status,
    isVerified: raw.isVerified,
    isFeatured: raw.isFeatured ?? false,
    rejectionReason: raw.rejectionReason,
    rejectedAt: raw.rejectedAt,
    approvedAt: raw.approvedAt,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : raw.createdAt,
    updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt.toISOString() : raw.updatedAt,
  };
}

export async function listAdminVendors(
  request: FastifyRequest<{
    Querystring: {
      page?: string;
      limit?: string;
      search?: string;
      status?: string;
      sort?: string;
      unlinked?: string;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const result = await runAdminList(request, {
    sortFields: SORT_FIELDS,
    searchFields: ['name', 'storeName', 'email', 'slug'],
    extendFilter: (filter, query) => {
      applyAdminUnlinkedProfileFilter(filter, query);
    },
    listRows: listAdminVendorRows,
    shapeItem: shapeVendorItem,
    collectionKey: 'vendors',
    message: 'Vendors list loaded.',
  });

  sendResponse(reply, result.statusCode, result.data as Record<string, unknown>, result.message);
}

export async function getAdminVendor(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const id = parseObjectId(request.params.id);
  const doc = await Vendor.findById(id).lean();
  if (!doc) throw new AppError('Vendor not found', 404);
  const raw = doc as unknown as Record<string, unknown>;

  // Populate user if linked
  const user = await User.findOne({ vendorId: id }).select('firstName lastName email').lean();
  const vendor = {
    ...shapeVendorItem(raw),
    user: user ? { firstName: user.firstName, lastName: user.lastName, email: user.email } : null,
    bankAccountName: raw.bankAccountName,
    bankAccountNumber: raw.bankAccountNumber,
    bankName: raw.bankName,
  };

  sendResponse(reply, 200, { vendor }, 'Vendor loaded.');
}

export async function createAdminVendor(
  request: FastifyRequest<{
    Body: {
      name: string;
      email: string;
      phone: string;
      storeName: string;
      storeDescription?: string;
      logo?: string;
      coverImage?: string;
      whatsapp?: string;
      address?: string;
      bankAccountName?: string;
      bankAccountNumber?: string;
      bankName?: string;
      status?: 'pending' | 'active' | 'suspended' | 'inactive';
      isFeatured?: boolean;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const body = request.body;
  if (!body?.name?.trim()) throw new AppError('Name is required', 400);
  if (!body?.email?.trim()) throw new AppError('Email is required', 400);
  if (!body?.phone?.trim()) throw new AppError('Phone is required', 400);
  if (!body?.storeName?.trim()) throw new AppError('Store name is required', 400);

  const slug = await generateUniqueSlug(Vendor, body.storeName.trim());

  const vendor = await Vendor.create({
    name: body.name.trim(),
    slug,
    email: body.email.trim().toLowerCase(),
    phone: body.phone.trim(),
    storeName: body.storeName.trim(),
    storeDescription: body.storeDescription ?? '',
    logo: body.logo ?? '',
    coverImage: body.coverImage ?? '',
    whatsapp: body.whatsapp ?? '',
    address: body.address ?? '',
    bankAccountName: body.bankAccountName ?? '',
    bankAccountNumber: body.bankAccountNumber ?? '',
    bankName: body.bankName ?? '',
    status: body.status ?? 'pending',
    isFeatured: body.isFeatured ?? false,
  });

  // Active-on-create must be linked to a user the same way Approve does.
  if (vendor.status === 'active') {
    await ensureVendorUserLink(vendor);
  }

  const populated = await Vendor.findById(vendor._id).lean();
  sendResponse(
    reply,
    201,
    { vendor: shapeVendorItem((populated ?? vendor) as unknown as Record<string, unknown>) },
    'Vendor created.'
  );
}

export async function updateAdminVendor(
  request: FastifyRequest<{
    Params: { id: string };
    Body: {
      name?: string;
      email?: string;
      phone?: string;
      storeName?: string;
      storeDescription?: string;
      logo?: string;
      coverImage?: string;
      whatsapp?: string;
      address?: string;
      bankAccountName?: string;
      bankAccountNumber?: string;
      bankName?: string;
      status?: 'pending' | 'active' | 'suspended' | 'inactive';
      isVerified?: boolean;
      isFeatured?: boolean;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const id = parseObjectId(request.params.id);
  const vendor = await Vendor.findById(id);
  if (!vendor) throw new AppError('Vendor not found', 404);

  const body = request.body ?? {};
  const previousFeatured = vendor.isFeatured ?? false;
  const previousStatus = vendor.status;
  if (body.name !== undefined) vendor.name = body.name;
  if (body.email !== undefined) vendor.email = body.email;
  if (body.phone !== undefined) vendor.phone = body.phone;
  if (body.storeName !== undefined) vendor.storeName = body.storeName;
  if (body.storeDescription !== undefined) vendor.storeDescription = body.storeDescription;
  if (body.logo !== undefined) vendor.logo = body.logo;
  if (body.coverImage !== undefined) vendor.coverImage = body.coverImage;
  if (body.whatsapp !== undefined) vendor.whatsapp = body.whatsapp;
  if (body.address !== undefined) vendor.address = body.address;
  if (body.bankAccountName !== undefined) vendor.bankAccountName = body.bankAccountName;
  if (body.bankAccountNumber !== undefined) vendor.bankAccountNumber = body.bankAccountNumber;
  if (body.bankName !== undefined) vendor.bankName = body.bankName;
  if (body.status !== undefined) vendor.status = body.status;
  if (body.isVerified !== undefined) vendor.isVerified = body.isVerified;
  if (body.isFeatured !== undefined) vendor.isFeatured = body.isFeatured;

  await vendor.save();

  if (vendor.status === 'active' && previousStatus !== 'active') {
    await ensureVendorUserLink(vendor);
  }

  if (
    body.isFeatured !== undefined &&
    body.isFeatured !== previousFeatured &&
    vendor.status === 'active'
  ) {
    scheduleFrontendRevalidation(frontendPathsForMarketplaceVendor());
  }

  const populated = await Vendor.findById(vendor._id).lean();
  sendResponse(
    reply,
    200,
    {
      vendor: shapeVendorItem(
        (populated ?? vendor.toObject()) as unknown as Record<string, unknown>
      ),
    },
    'Vendor updated.'
  );
}

export async function approveAdminVendor(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
): Promise<void> {
  const { userId } = requireAdmin(request);
  const id = parseObjectId(request.params.id);
  const vendor = await Vendor.findById(id);
  if (!vendor) throw new AppError('Vendor not found', 404);

  // Link before activating so unlinkable vendors stay pending / prior status.
  await ensureVendorUserLink(vendor);

  vendor.status = 'active';
  vendor.approvedAt = new Date();
  vendor.approvedBy = new mongoose.Types.ObjectId(userId);
  vendor.rejectionReason = '';
  vendor.rejectedAt = null;
  vendor.rejectedBy = null;
  await vendor.save();

  const populated = await Vendor.findById(vendor._id).lean();
  sendResponse(
    reply,
    200,
    {
      vendor: shapeVendorItem(
        (populated ?? vendor.toObject()) as unknown as Record<string, unknown>
      ),
    },
    'Vendor approved.'
  );
}

export async function rejectAdminVendor(
  request: FastifyRequest<{ Params: { id: string }; Body: { reason: string } }>,
  reply: FastifyReply
): Promise<void> {
  const { userId } = requireAdmin(request);
  const id = parseObjectId(request.params.id);
  const vendor = await Vendor.findById(id);
  if (!vendor) throw new AppError('Vendor not found', 404);

  const reason = typeof request.body?.reason === 'string' ? request.body.reason.trim() : '';
  // Rejection maps to inactive (no separate rejected status in the vendor model).
  vendor.status = 'inactive';
  vendor.rejectionReason = reason;
  vendor.rejectedAt = new Date();
  vendor.rejectedBy = new mongoose.Types.ObjectId(userId);
  vendor.approvedAt = null;
  vendor.approvedBy = null;
  await vendor.save();

  const populated = await Vendor.findById(vendor._id).lean();
  sendResponse(
    reply,
    200,
    {
      vendor: shapeVendorItem(
        (populated ?? vendor.toObject()) as unknown as Record<string, unknown>
      ),
    },
    'Vendor rejected.'
  );
}
