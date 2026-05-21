import winston from 'winston';
import { ENVIRONMENT } from '../config/env';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp as string} [${level}]: ${message as string}`;
    if (Object.keys(meta).length > 0) {
      msg += `\n${JSON.stringify(meta, null, 2)}`;
    }
    return msg;
  })
);

/** Winston logger for workers, startup, and sockets. HTTP uses Fastify's built-in Pino. */
export const logger = winston.createLogger({
  level: 'silly',
  format: logFormat,
  defaultMeta: { service: 'oj-backend' },
  transports: [new winston.transports.Console()],
});

if (ENVIRONMENT.nodeEnv !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}
