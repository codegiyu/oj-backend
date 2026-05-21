# OJ Backend

Fastify TypeScript backend for OJ Multimedia.

## Features

- ⚡ **Fastify** - Fast and low overhead web framework
- 🔐 **JWT Authentication** - Secure token-based authentication
- 📦 **Redis** - Caching and session management
- 🚀 **BullMQ** - Job queue management
- 📧 **Email Service** - Nodemailer integration
- 📝 **Logging** - Winston logger
- ☁️ **S3 Management** - AWS S3 file storage
- 🎨 **ESLint & Prettier** - Code quality and formatting
- 📅 **date-fns** - Date manipulation utilities
- ✅ **TypeScript** - Full type safety

## Prerequisites

- Node.js 18+ 
- Redis server
- AWS S3 account (for file storage)
- SMTP server (for email)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

3. Update `.env` with your configuration values.

## Development

```bash
# Run in development mode with hot reload
npm run dev

# Or use nodemon
npm run start:dev
```

## Production

Set `NODE_ENV=production` and provide strong, non-placeholder values for at least:

- `DATABASE_URL`
- `JWT_SECRET` (minimum 16 characters)
- `REFRESH_TOKEN_SECRET` (minimum 16 characters)

The server refuses to start in production when these are missing or use known default placeholders.

```bash
# Build the project
npm run build

# Start the server
npm start
```

## Release checklist

Before deploy:

- [ ] `npm run test:unit && npm run test:integration`
- [ ] `npm run type-check && npm run lint && npm run format:check`
- [ ] `npm run audit:ci` (fails on high or critical vulnerabilities)
- [ ] Production env secrets verified (no placeholder JWT values)

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run start:dev` - Start with nodemon
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run type-check` - Type check without building
- `npm run test:unit` / `test:integration` / `test:e2e` / `test:phase:*` - Test suites (see `tests/README.md`)
- `npm run audit` - Dependency vulnerability report
- `npm run audit:ci` - Fail on high or critical vulnerabilities

## Project Structure

```
src/
├── config/          # Configuration files
│   ├── env.ts       # Environment variables
│   ├── redis.ts     # Redis client setup
│   ├── bullmq.ts    # BullMQ queue setup
│   └── s3.ts        # AWS S3 client setup
├── controllers/     # Route controllers
├── middleware/      # Custom middleware
├── routes/          # Route definitions
├── services/        # Business logic services
│   ├── auth.service.ts
│   ├── email.service.ts
│   └── s3.service.ts
├── utils/           # Utility functions
│   └── logger.ts    # Winston logger
├── types/           # TypeScript type definitions
├── queues/          # BullMQ queue processors
├── plugins/         # Fastify plugins
├── app.ts           # Fastify app setup
└── server.ts        # Server entry point
```

## Environment Variables

See `.env.example` for all available environment variables.

## License

ISC
