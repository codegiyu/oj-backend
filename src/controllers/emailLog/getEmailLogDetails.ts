import { FastifyRequest, FastifyReply } from 'fastify';
import mongoose from 'mongoose';
import { AppError } from '../../utils/AppError';
import { sendResponse } from '../../utils/response';
import { EmailLog } from '../../models/emailLog';
import { getAuthUser } from '../../utils/getAuthUser';

export async function getEmailLogDetails(
  request: FastifyRequest<{ Params: { emailLogId: string } }>,
  reply: FastifyReply
): Promise<void> {
  const user = getAuthUser(request);
  if (!user || user.scope !== 'console-access') {
    throw new AppError('Access denied: only admins may view email log details', 403);
  }

  const { emailLogId } = request.params;
  if (!emailLogId) throw new AppError('Email log ID is required', 400);
  if (!mongoose.Types.ObjectId.isValid(emailLogId)) {
    throw new AppError('Invalid email log ID format', 400);
  }

  const emailLog = await EmailLog.findById(emailLogId).lean();
  if (!emailLog) throw new AppError('Email log not found', 404);

  sendResponse(reply, 200, { emailLog }, 'Email log details loaded.');
}
