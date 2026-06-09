import { describe, expect, it } from 'vitest';
import { render } from '@react-email/render';
import { OTPCode } from '../../src/queues/templates/OTP';
import type { AppBranding } from '../../src/utils/branding';

const testBranding: AppBranding = {
  name: 'OJ Multimedia',
  primaryColor: '#1a1a2e',
  secondaryColor: '#e94560',
  fontFamily: 'Comfortaa',
  supportEmail: 'support@ojmultimedia.com',
  logoUrl: 'https://ojmultimedia.com/logo.png',
  email: {
    from: 'noreply@ojmultimedia.com',
    fromName: 'OJ Multimedia',
    host: 'smtp.example.com',
    port: 587,
    password: 'test',
  },
};

describe('email template render', () => {
  it('renders OTP verification email to non-empty HTML', async () => {
    const html = await render(
      OTPCode({
        type: 'verificationCode',
        to: 'user@example.com',
        name: 'Test User',
        code: '123456',
        branding: testBranding,
      })
    );

    expect(html.length).toBeGreaterThan(100);
    expect(html).toContain('123456');
    expect(html).toContain('OJ Multimedia');
  });
});
