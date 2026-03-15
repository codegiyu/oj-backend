import type { AppBranding } from '../../utils/branding';
import type { OTPJobData } from '../../lib/types/queues';
import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import {
  anchor,
  box,
  button,
  container,
  footer,
  headerText,
  hr,
  main,
  note,
  paragraph,
  responsiveStyles,
  signature,
} from './styles/main';

export function OTPCode({
  to,
  name,
  code,
  avatar,
  branding,
}: OTPJobData & { branding: AppBranding }) {
  const previewText = `Your ${branding.name} OTP code is ${code}`;

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
        <meta name="format-detection" content="one-time-code" />
      </Head>
      <Preview>{previewText}</Preview>

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
            <Text style={{ ...headerText, color: branding.primaryColor }}>Hello, {name ?? 'there'}!</Text>
            <Text style={paragraph}>Use the verification code below to access your account.</Text>
            <Button
              style={{ ...button, backgroundColor: branding.primaryColor }}
              className="button">
              {code}
            </Button>
            <Text style={note}>
              This code is valid for 10 minutes. Please do not share it with anyone.
            </Text>
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
