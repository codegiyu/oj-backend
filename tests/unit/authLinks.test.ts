import { describe, expect, it } from 'vitest';
import {
  RESET_LINK_EXPIRATION_MINUTES,
  RESET_LINK_EXPIRATION_SECONDS,
  buildPasswordAuthUrl,
  normalizeAppBaseUrl,
} from '../../src/utils/authLinks';

describe('authLinks', () => {
  it('uses 30 minute expiration constants', () => {
    expect(RESET_LINK_EXPIRATION_SECONDS).toBe(1800);
    expect(RESET_LINK_EXPIRATION_MINUTES).toBe(30);
  });

  it('strips trailing slash from base URL', () => {
    expect(normalizeAppBaseUrl('https://admin.example.com/')).toBe('https://admin.example.com');
  });

  it('builds console reset URL under /admin/auth', () => {
    const url = buildPasswordAuthUrl({
      baseUrl: 'https://admin.example.com/',
      accessType: 'console',
      linkTarget: 'reset',
      email: 'admin@example.com',
      scopeToken: 'abc123',
    });

    expect(url).toBe(
      'https://admin.example.com/admin/auth/reset-password?email=admin%40example.com&scopeToken=abc123'
    );
  });

  it('builds console invite URL under accept-invite', () => {
    const url = buildPasswordAuthUrl({
      baseUrl: 'https://admin.example.com',
      accessType: 'console',
      linkTarget: 'invite',
      email: 'new@example.com',
      scopeToken: 'tok456',
    });

    expect(url).toBe(
      'https://admin.example.com/admin/auth/accept-invite/create-password?email=new%40example.com&scopeToken=tok456'
    );
  });

  it('builds client reset URL without /admin prefix', () => {
    const url = buildPasswordAuthUrl({
      baseUrl: 'https://app.example.com',
      accessType: 'client',
      linkTarget: 'reset',
      email: 'user@example.com',
      scopeToken: 'xyz',
    });

    expect(url).toBe(
      'https://app.example.com/auth/reset-password?email=user%40example.com&scopeToken=xyz'
    );
  });

  it('defaults linkTarget to reset', () => {
    const url = buildPasswordAuthUrl({
      baseUrl: 'https://admin.example.com',
      accessType: 'console',
      email: 'a@b.co',
      scopeToken: 't',
    });

    expect(url).toContain('/admin/auth/reset-password');
  });
});
