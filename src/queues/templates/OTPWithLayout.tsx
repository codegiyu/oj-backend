import type { AppBranding } from '../../utils/branding';
import type { OTPJobData } from '../../lib/types/queues';
import type { EmailBranding } from './components/Header';
import { TemplateLayout } from './components/TimeBasedTemplateLayout';

interface TemplateProps extends Omit<OTPJobData, 'type'> {
  name: string;
  to: string;
  code: string;
  avatar?: string;
  branding: EmailBranding | AppBranding;
}

export function OTPCodeWithLayout({ name, to, code, avatar, branding }: TemplateProps) {
  const previewText = `Your ${branding.name} verification code is ${code}`;

  return (
    <TemplateLayout
      preview={previewText}
      name={name}
      to={to}
      avatar={avatar}
      heading={`${branding.name} Account Verification Code`}
      code={code}
      branding={branding as EmailBranding}
      contentsArr={[
        {
          type: 'textBlock',
          props: {
            paragraphs: [
              {
                type: 'text',
                content:
                  'Please use the following code for verification on your account. Please note that the code is only valid for 10 minutes',
              },
            ],
          },
        },
        {
          type: 'codeOrLinkDisplay',
          props: {
            type: 'code',
            content: code || '******',
            expiresIn: 10,
          },
        },
      ]}
    />
  );
}
