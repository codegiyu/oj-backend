import type { AppBranding } from '../../utils/branding';
import type { ResetPasswordJobData } from '../../lib/types/queues';
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Section,
  Text,
} from '@react-email/components';
import { CodeOrLinkDisplay } from './components/CodeOrLinkDisplay';
import {
  anchor,
  box,
  container,
  footer,
  headerText,
  hr,
  main,
  paragraph,
  responsiveStyles,
  signature,
} from './styles/main';

export function ResetPasswordLink({
  to,
  name,
  link,
  avatar,
  branding,
}: ResetPasswordJobData & { branding: AppBranding }) {
  return (
    <Html>
      <Head>
        <style>
          {`@font-face {
            font-family: '${branding.fontFamily}';
            src: url('https://fonts.gstatic.com/s/comfortaa/v28/1Ptsg8LJRfWJmhDAuUs4TYFs.woff2') format('woff2');
          }`}
        </style>
        <style>{responsiveStyles}</style>
      </Head>

      <Body style={{ ...main, fontFamily: branding.fontFamily }}>
        <Container style={{ ...container }} className="container">
          <Section style={box}>
            {avatar && (
              <Img
                src={avatar}
                width="50"
                height="50"
                alt={branding.name}
                style={{ margin: '0 auto' }}
              />
            )}
            {branding.logoUrl && !avatar && (
              <Img
                src={branding.logoUrl}
                width="50"
                height="50"
                alt={branding.name}
                style={{ margin: '0 auto' }}
              />
            )}
            <Hr style={hr} />
            <Text style={{ ...headerText, color: branding.primaryColor }}>
              Hello, {name ?? 'User'}!
            </Text>
            <Text style={paragraph}>
              Use the link below to change your password. This link will expire in 10 minutes.
            </Text>
            <CodeOrLinkDisplay type="link" content={link} expiresIn={10} />
            <Text style={signature}>
              Cheers, <br />
              ❤️
            </Text>
            <Hr style={hr} />
            <Text style={footer}>
              This email was intended for{' '}
              <a style={{ ...anchor, color: branding.primaryColor }} href={`mailto:${to}`}>
                {to}
              </a>
              . If this wasn't you, please ignore and report to{' '}
              <a
                style={{ ...anchor, color: branding.primaryColor }}
                href={`mailto:${branding.supportEmail}`}>
                {branding.supportEmail}
              </a>
              .
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
