import { FastifyRequest, FastifyReply } from 'fastify';
import { sendResponse } from '../../utils/response';
import { ContactSubmission } from '../../models/contactSubmission';
import { parsePositiveInteger, parseSearch, normalizeSort } from '../../utils/helpers';
import { leanIdToString } from './admin.helpers';

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
    ContactSubmission.find(filter).sort(sortStr).skip(skip).limit(limit).lean(),
    ContactSubmission.countDocuments(filter),
  ]);

  const contactSubmissions = submissions.map(doc => {
    const d = doc as unknown as Record<string, unknown>;
    return {
      _id: d._id != null ? leanIdToString(d._id) : d._id,
      name: d.name,
      phone: d.phone,
      email: d.email,
      subject: d.subject,
      message: d.message,
      createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : d.createdAt,
      updatedAt: d.updatedAt instanceof Date ? d.updatedAt.toISOString() : d.updatedAt,
    };
  });

  sendResponse(
    reply,
    200,
    {
      contactSubmissions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    },
    'Contact submissions loaded.'
  );
}
