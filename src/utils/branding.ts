import { ENVIRONMENT } from '../config/env';

export interface AppBranding {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  supportEmail: string;
  logoUrl: string;
  email: {
    from: string;
    fromName: string;
    host: string;
    port: number;
    password: string;
  };
}

export function getAppBranding(): AppBranding {
  const b = ENVIRONMENT.branding;
  const e = ENVIRONMENT.email;
  return {
    name: b.appName,
    primaryColor: b.primaryColor,
    secondaryColor: b.secondaryColor,
    fontFamily: b.fontFamily,
    supportEmail: b.supportEmail,
    logoUrl: b.logoUrl,
    email: {
      from: e.from,
      fromName: e.fromName,
      host: e.smtp.host,
      port: e.smtp.port,
      password: e.smtp.pass,
    },
  };
}

export function getAppSender(): string {
  const branding = getAppBranding();
  return `${branding.name} <${branding.email.from}>`;
}
