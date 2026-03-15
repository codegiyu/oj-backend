import { Img, Link } from '@react-email/components';
import type { AppBranding } from '../../../utils/branding';
import type { EmailStyle } from './types';
import { Box } from './Box';
import { MulticolorBand } from './MulticolorBand';

export interface EmailBranding extends AppBranding {
  primaryUrl?: string;
  fullLogo?: string;
  logo?: string;
  socialMedia?: {
    x?: string;
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    linkedin?: string;
  };
}

interface HeaderProps {
  branding: EmailBranding;
}

export const Header = ({ branding }: HeaderProps) => {
  const logoUrl = branding.logo ?? branding.logoUrl;
  const primaryUrl = branding.primaryUrl ?? '#';

  if (!logoUrl) return null;

  return (
    <Box styles={[{}, { padding: '36px 20px 2px' }]}>
      <MulticolorBand />
      <Link
        href={primaryUrl}
        style={{ width: '151px', display: 'block', margin: '0 auto' }}>
        <Img src={logoUrl} alt={branding.name} width={152} height={28} style={imgStyle} />
      </Link>
    </Box>
  );
};

const imgStyle: EmailStyle = {
  margin: '0 auto',
  display: 'block',
  overflow: 'hidden',
  objectFit: 'cover',
};
