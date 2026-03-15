import type { InviteAdminJobData } from '../../lib/types/queues';
import type { AppBranding } from '../../utils/branding';
import { Body, Container, Head, Hr, Html, Img, Section, Text } from '@react-email/components';
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

export function InviteAdminTemplate({
  to,
  name,
  firstName,
  lastName,
  inviteLink,
  role,
  permissions,
  avatar,
  branding,
}: InviteAdminJobData & { branding: AppBranding }) {
  const displayName =
    firstName && lastName ? `${firstName} ${lastName}` : name ?? 'Admin';

  const groupPermissions = (perms: string[]): Record<string, number> => {
    const groups: Record<string, number> = {};
    perms.forEach(perm => {
      const prefix = perm.split(':')[0] || perm.split('.')[0] || perm;
      const formattedName = prefix
        .split(/[-.]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      groups[formattedName] = (groups[formattedName] || 0) + 1;
    });
    return groups;
  };

  const permissionGroups =
    permissions && permissions.length > 0 ? groupPermissions(permissions) : {};
  const totalPermissions = permissions?.length ?? 0;
  const groupNames = Object.keys(permissionGroups).sort();

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
              Welcome to {branding.name}, {displayName}!
            </Text>
            <Text style={paragraph}>
              You have been invited to join the {branding.name} Admin Console as an{' '}
              <strong>{role}</strong>.
            </Text>
            {permissions && permissions.length > 0 && (
              <>
                <Text style={paragraph}>
                  You have been assigned <strong>{totalPermissions}</strong> permission
                  {totalPermissions !== 1 ? 's' : ''} across the following group
                  {groupNames.length !== 1 ? 's' : ''}:
                </Text>
                <Section
                  style={{
                    backgroundColor: '#f7f9fc',
                    borderRadius: '6px',
                    padding: '16px',
                    margin: '16px 0',
                    textAlign: 'left' as const,
                  }}>
                  {groupNames.map((groupName, index) => (
                    <Text
                      key={groupName}
                      style={{
                        color: '#525f7f',
                        fontSize: '14px',
                        lineHeight: '1.6',
                        margin: index > 0 ? '8px 0 0' : '0',
                      }}>
                      • <strong>{groupName}</strong> ({permissionGroups[groupName]} permission
                      {permissionGroups[groupName] !== 1 ? 's' : ''})
                    </Text>
                  ))}
                </Section>
              </>
            )}
            <Text style={paragraph}>
              Click the link below to accept your invitation and set up your account password. This
              link will expire in 1 hour.
            </Text>
            <CodeOrLinkDisplay type="link" content={inviteLink} expiresIn={60} />
            <Text style={signature}>
              Cheers, <br />
              ❤️ The {branding.name} Team
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
