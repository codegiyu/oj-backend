import type { FastifyServerOptions } from 'fastify';
import type { LoggerOptions } from 'pino';
import pino from 'pino';

function parseBooleanEnv(value: string | undefined): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === '1' || normalized === 'true' || normalized === 'yes') {
    return true;
  }

  if (normalized === '0' || normalized === 'false' || normalized === 'no') {
    return false;
  }

  return undefined;
}

/** Human-readable multiline logs (pino-pretty). JSON when false. */
export function shouldUsePrettyLogs(
  nodeEnv: string,
  raw: NodeJS.ProcessEnv = process.env
): boolean {
  const format = raw.LOG_FORMAT?.trim().toLowerCase();

  if (format === 'json') {
    return false;
  }

  if (format === 'pretty') {
    return true;
  }

  const prettyOverride = parseBooleanEnv(raw.LOG_PRETTY);

  if (prettyOverride !== undefined) {
    return prettyOverride;
  }

  return nodeEnv !== 'production';
}

export function resolveLogLevel(nodeEnv: string, raw: NodeJS.ProcessEnv = process.env): string {
  const explicit = raw.LOG_LEVEL?.trim().toLowerCase();

  if (explicit) {
    return explicit;
  }

  return nodeEnv === 'production' ? 'info' : 'debug';
}

/** Shared pino-pretty options: multiline objects, level first, less noise. */
export const PINO_PRETTY_OPTIONS = {
  colorize: true,
  translateTime: 'SYS:standard',
  singleLine: false,
  hideObject: false,
  levelFirst: true,
  ignore: 'pid,hostname',
} as const;

function pinoSerializers(): LoggerOptions['serializers'] {
  return {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
  };
}

export function buildPinoLoggerOptions(
  nodeEnv: string,
  raw: NodeJS.ProcessEnv = process.env
): LoggerOptions {
  const pretty = shouldUsePrettyLogs(nodeEnv, raw);
  const level = resolveLogLevel(nodeEnv, raw);

  const options: LoggerOptions = {
    level,
    base: { service: 'oj-backend' },
    serializers: pinoSerializers(),
  };

  if (pretty) {
    options.transport = {
      target: 'pino-pretty',
      options: PINO_PRETTY_OPTIONS,
    };
  }

  return options;
}

export function buildFastifyLoggerConfig(
  nodeEnv: string,
  raw: NodeJS.ProcessEnv = process.env
): NonNullable<FastifyServerOptions['logger']> {
  return buildPinoLoggerOptions(nodeEnv, raw);
}

/** Printed after each request's logs when output is human-readable (pino-pretty). */
export const REQUEST_LOG_SEPARATOR = '------------';

export function shouldLogRequestSeparator(
  nodeEnv: string,
  raw: NodeJS.ProcessEnv = process.env
): boolean {
  return shouldUsePrettyLogs(nodeEnv, raw);
}
