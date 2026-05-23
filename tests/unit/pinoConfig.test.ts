import { describe, expect, it } from 'vitest';
import {
  buildPinoLoggerOptions,
  resolveLogLevel,
  shouldUsePrettyLogs,
} from '../../src/config/pino';

describe('pino logging config', () => {
  it('enables pretty logs outside production by default', () => {
    expect(shouldUsePrettyLogs('development')).toBe(true);
    expect(shouldUsePrettyLogs('staging')).toBe(true);
    expect(shouldUsePrettyLogs('production')).toBe(false);
  });

  it('respects LOG_FORMAT and LOG_PRETTY overrides', () => {
    expect(shouldUsePrettyLogs('production', { LOG_FORMAT: 'pretty' })).toBe(true);
    expect(shouldUsePrettyLogs('development', { LOG_FORMAT: 'json' })).toBe(false);
    expect(shouldUsePrettyLogs('production', { LOG_PRETTY: '1' })).toBe(true);
    expect(shouldUsePrettyLogs('development', { LOG_PRETTY: '0' })).toBe(false);
  });

  it('uses multiline pino-pretty transport when pretty is enabled', () => {
    const options = buildPinoLoggerOptions('development');

    expect(options.transport).toEqual({
      target: 'pino-pretty',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      options: expect.objectContaining({ singleLine: false, hideObject: false }),
    });
  });

  it('omits transport when JSON logs are requested', () => {
    const options = buildPinoLoggerOptions('development', { LOG_FORMAT: 'json' });

    expect(options.transport).toBeUndefined();
  });

  it('resolves log level from env or node env', () => {
    expect(resolveLogLevel('production')).toBe('info');
    expect(resolveLogLevel('development')).toBe('debug');
    expect(resolveLogLevel('production', { LOG_LEVEL: 'warn' })).toBe('warn');
  });
});
