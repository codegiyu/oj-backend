import { FastifyRequest, FastifyReply } from 'fastify';
import { User } from '../../models/user';
import { sendResponse } from '../../utils/response';
import { parsePositiveInteger, parseSearch } from '../../utils/helpers';
import { leanIdToString } from './admin.helpers';
export async function searchAdminUsers(
  request: FastifyRequest<{ Querystring: { search?: string; limit?: string } }>,
  reply: FastifyReply
): Promise<void> {
  const search = parseSearch(request.query.search);
  const limit = parsePositiveInteger(request.query.limit, 20, 50);

  const filter: Record<string, unknown> = {};
  if (search) {
    filter.$or = [
      { email: { $regex: search, $options: 'i' } },
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
    ];
  }

  const items = await User.find(filter)
    .select('firstName lastName email artistId')
    .limit(limit)
    .lean();

  const users = (
    items as {
      _id: unknown;
      firstName?: string;
      lastName?: string;
      email?: string;
      artistId?: unknown;
    }[]
  ).map(u => ({
    _id: leanIdToString(u._id),
    email: u.email ?? '',
    firstName: u.firstName ?? '',
    lastName: u.lastName ?? '',
    ...(u.artistId != null ? { artistId: leanIdToString(u.artistId) } : {}),
  }));

  sendResponse(reply, 200, { users }, 'Users loaded.');
}
