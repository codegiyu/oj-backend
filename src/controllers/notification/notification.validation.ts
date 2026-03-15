export const listNotificationsQuerystringSchema = {
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'string' },
      limit: { type: 'string' },
      isRead: { type: 'string' },
      userId: { type: 'string' },
    },
  },
} as const;

export const createNotificationBodySchema = {
  body: {
    type: 'object',
    required: ['userId', 'userModel', 'title', 'message'],
    properties: {
      userId: { type: 'string' },
      userModel: { type: 'string', enum: ['User', 'Admin'] },
      title: { type: 'string' },
      message: { type: 'string' },
      eventType: { type: 'string' },
      triggerDate: { type: 'string' },
      expiresAt: { type: 'string' },
      sendRealTime: { type: 'boolean' },
      sendEmail: { type: 'boolean' },
      subject: { type: 'string' },
      context: { type: 'object' },
    },
  },
} as const;

export const readOneNotificationSchema = {
  params: {
    type: 'object',
    required: ['notificationId'],
    properties: {
      notificationId: { type: 'string' },
    },
  },
  body: {
    type: 'object',
    properties: {
      isRead: { type: 'boolean' },
    },
  },
} as const;

export const readAllNotificationsBodySchema = {
  body: {
    type: 'object',
    properties: {
      isRead: { type: 'boolean' },
    },
  },
} as const;

export const updatePreferencesBodySchema = {
  body: {
    type: 'object',
    properties: {
      realtime: { type: 'boolean' },
      email: { type: 'boolean' },
      sms: { type: 'boolean' },
      marketingEmails: { type: 'boolean' },
    },
  },
} as const;

export const updatePushTokenBodySchema = {
  body: {
    type: 'object',
    required: ['pushTokenUpdate'],
    properties: {
      pushTokenUpdate: {
        type: 'object',
        required: ['pushToken'],
        properties: {
          pushToken: { type: ['string', 'null'] },
        },
      },
    },
  },
} as const;
