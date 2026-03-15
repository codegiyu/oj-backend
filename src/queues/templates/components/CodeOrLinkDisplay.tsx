import { Heading, Link } from '@react-email/components';
import { Box } from './Box';
import type { EmailStyle } from './types';

export interface CodeOrLinkDisplayProps {
  type: 'code' | 'link';
  content: string;
  expiresIn: number;
}

export const CodeOrLinkDisplay = ({ type, content, expiresIn }: CodeOrLinkDisplayProps) => {
  return (
    <Box
      style={{
        borderRadius: '12px',
        background: 'rgba(0, 0, 0, 0.03)',
        overflow: 'hidden',
      }}>
      <div
        style={{
          background: 'rgba(0, 0, 0, 0.05)',
          borderBottom: '1px solid rgba(0, 0, 0, 0.03)',
        }}>
        <table style={{ width: '100%', maxWidth: '600px' }}>
          <tbody style={{ width: '100%' }}>
            <tr style={{ width: '100%' }}>
              <td style={{ textAlign: 'left', padding: '16px' }}>
                <Heading style={{ ...textStyle, fontWeight: '500' }} className="text-d-90">
                  {type === 'code' ? 'Authorization Code' : 'Link'}
                </Heading>
                <p
                  style={{ ...textStyle, marginTop: '6px' }}
                  className="text-d-50 mobile-only">{`This ${type} will expire in ${expiresIn} mins`}</p>
              </td>
              <td style={{ textAlign: 'right', padding: '16px' }} className="desktop-only">
                <p
                  style={{ ...textStyle }}
                  className="text-d-50">{`This ${type} will expire in ${expiresIn} mins`}</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div style={{ padding: type === 'code' ? '20px 24px' : '24px' }}>
        {type === 'code' ? (
          <p
            style={{
              wordBreak: 'break-word',
              ...textStyle,
              ...codeTextStyle,
            }}
            className="text-d-100">
            {content.slice(0, 6)}
          </p>
        ) : (
          <Link
            href={content}
            style={{
              wordBreak: 'break-word',
              ...textStyle,
              color: 'inherit',
              textDecoration: 'none',
            }}
            className="text-d-100">
            {content}
          </Link>
        )}
      </div>
    </Box>
  );
};

const textStyle: EmailStyle = {
  fontSize: '14px',
  fontWeight: 400,
  lineHeight: '14px',
  letterSpacing: '-0.28px',
};

const codeTextStyle: EmailStyle = {
  fontSize: '24px',
  fontWeight: 500,
  lineHeight: '29px',
  letterSpacing: '15.84px',
  textAlign: 'center',
};
