import pino from 'pino';
import { ENVIRONMENT } from '../config/env';

type LogBindings = Record<string, unknown>;

function toBindings(second: unknown): LogBindings | undefined {
  if (second === undefined) {
    return undefined;
  }

  if (second instanceof Error) {
    return { err: second };
  }

  if (typeof second === 'object' && second !== null) {
    return second as LogBindings;
  }

  return { detail: second };
}

function createRootLogger(): pino.Logger {
  const isProduction = ENVIRONMENT.nodeEnv === 'production';

  return pino({
    level: isProduction ? 'info' : 'debug',
    base: { service: 'oj-backend' },
    ...(!isProduction
      ? {
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:standard',
            },
          },
        }
      : {}),
  });
}

const root = createRootLogger();

function logLevel(
  method: 'info' | 'warn' | 'error' | 'debug',
  first: string | LogBindings,
  second?: unknown
): void {
  if (typeof first === 'string') {
    const bindings = toBindings(second);

    if (bindings) {
      root[method](bindings, first);
    } else {
      root[method](first);
    }

    return;
  }

  const msg = typeof second === 'string' ? second : '';

  root[method](first, msg);
}

/** Pino logger for workers, startup, sockets, and config. HTTP request logs use Fastify Pino. */
export const logger = {
  info: (first: string | LogBindings, second?: unknown) => logLevel('info', first, second),
  warn: (first: string | LogBindings, second?: unknown) => logLevel('warn', first, second),
  error: (first: string | LogBindings, second?: unknown) => logLevel('error', first, second),
  debug: (first: string | LogBindings, second?: unknown) => logLevel('debug', first, second),
  child: (bindings: LogBindings) => root.child(bindings),
};

export type AppLogger = typeof logger;
