import { FastifyRequest, FastifyReply } from 'fastify';
import { AppError } from '../../utils/AppError';
import { sendResponse } from '../../utils/response';
import { ContactSubmission } from '../../models/contactSubmission';
import { getAuthUser } from '../../utils/getAuthUser';
import { parsePositiveInteger, parseSearch, normalizeSort } from '../../utils/helpers';

const SORT_FIELDS = ['createdAt', 'updatedAt', 'name', 'subject', 'email'];

export async function listContactSubmissions(
  request: FastifyRequest<{
    Querystring: {
      page?: string;
      limit?: string;
      search?: string;
      sort?: string;
    };
  }>,
  reply: FastifyReply
): Promise<void> {
  const user = getAuthUser(request);
  if (!user || user.scope !== 'console-access') {
    throw new AppError('Access denied: only admins may list contact submissions', 403);
  }

  const page = parsePositiveInteger(request.query.page, 1, 1000);
  const limit = parsePositiveInteger(request.query.limit, 25, 100);
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};
  const search = parseSearch(request.query.search);
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { subject: { $regex: search, $options: 'i' } },
      { message: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
  }

  const sortStr = normalizeSort(request.query.sort, SORT_FIELDS, '-createdAt');

  const [submissions, total] = await Promise.all([
    ContactSubmission.find(filter)
      .sort(sortStr)
      .skip(skip)
      .limit(limit)
      .lean(),
    ContactSubmission.countDocuments(filter),
  ]);

  const contactSubmissions = submissions.map((doc: Record<string, unknown>) => ({
    _id: doc._id != null ? String(doc._id) : doc._id,
    name: doc.name,
    phone: doc.phone,
    email: doc.email,
    subject: doc.subject,
    message: doc.message,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt,
  }));

  sendResponse(reply, 200, {
    contactSubmissions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  }, 'Contact submissions loaded.');
}
