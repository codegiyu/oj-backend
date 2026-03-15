import type { AppBranding } from '../../utils/branding';
import type { NotificationEmailJobData } from '../../lib/types/queues';
import { Body, Container, Head, Hr, Html, Preview, Section, Text } from '@react-email/components';
import { container, headerText, hr, main, note, paragraph, responsiveStyles } from './styles/main';

export function NotificationEmailTemplate({
  title,
  message,
  eventType,
  branding,
}: NotificationEmailJobData & { branding: AppBranding }) {
  const previewText = title;

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
      <Preview>{previewText}</Preview>

      <Body style={{ ...main, fontFamily: branding.fontFamily }}>
        <Container style={{ ...container }} className="container">
          <Section>
            <Text style={{ ...headerText, color: branding.primaryColor }}>{title}</Text>
            <Text style={paragraph}>{message}</Text>
            {eventType ? (
              <Text style={{ ...note, marginTop: '16px', textTransform: 'capitalize' }}>
                Event: {eventType.replace(/_/g, ' ')}
              </Text>
            ) : null}
          </Section>

          <Hr style={hr} />

          <Text style={{ ...note, textAlign: 'center' }}>
            Sent by {branding.name}. You are receiving this because you have an account with us.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
