import { FastifyRequest, FastifyReply } from 'fastify';
import { sendResponse } from '../../utils/response';
import { ContactSubmission } from '../../models/contactSubmission';

interface SubmitContactBody {
  name: string;
  phone: string;
  email?: string;
  subject: string;
  message: string;
}

/** POST /public/contact — validate body, persist to ContactSubmission, return 201 with message and contactSubmission. */
export async function submitContact(
  request: FastifyRequest<{ Body: SubmitContactBody }>,
  reply: FastifyReply
): Promise<void> {
  const { name, phone, subject, message } = request.body;
  const email = request.body.email?.trim();

  const submission = await ContactSubmission.create({
    name: name.trim(),
    phone: phone.trim(),
    email: email ? email.toLowerCase() : '',
    subject: subject.trim(),
    message: message.trim(),
  });

  const data = {
    message: "Thank you for your message. We'll get back to you soon.",
    contactSubmission: {
      _id: String(submission._id),
      createdAt: submission.createdAt.toISOString(),
    },
  };

  sendResponse(reply, 201, data, 'Message received.');
}
