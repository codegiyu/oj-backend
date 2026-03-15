import { Img, Link } from '@react-email/components';
import type { EmailBranding } from './Header';
import type { EmailStyle } from './types';
import { Box } from './Box';
import { MulticolorBand } from './MulticolorBand';

interface FooterProps {
  email: string;
  branding: EmailBranding;
}

export const Footer = ({ email, branding }: FooterProps) => {
  const currentYear = new Date().getFullYear();
  const socialMedia = branding.socialMedia ?? {};
  const fullLogo = branding.fullLogo ?? branding.logoUrl ?? branding.logo;
  const primaryUrl = branding.primaryUrl ?? '#';

  return (
    <Box styles={[footerWrapStyle, {}]}>
      <Box>
        <p className="text-d-90" style={footerTextStyle}>
          This email was intended for <span className="text-sw-100">{email} </span>. If you were not
          expecting this mail, please ignore and report to us immediately at{' '}
          <span className="text-sw-100">{branding.supportEmail}</span>
          <br />
          <br />™ and © {currentYear} {branding.name}. All Right Reserved.
        </p>
        <Box style={footerBottomWrapStyle}>
          <table style={{ width: '100%', maxWidth: '600px' }}>
            <tbody style={{ width: '100%' }}>
              <tr style={{ width: '100%' }}>
                <td style={{ textAlign: 'left' }}>
                  {fullLogo ? (
                    <Link href={primaryUrl}>
                      <Img
                        src={fullLogo}
                        alt={branding.name}
                        width={100}
                        height={19}
                        style={imgStyle}
                      />
                    </Link>
                  ) : null}
                </td>
                <td style={{ textAlign: 'right' }}>
                  {(socialMedia.x ||
                    socialMedia.instagram ||
                    socialMedia.facebook ||
                    socialMedia.tiktok ||
                    socialMedia.linkedin) && (
                    <table style={{ width: '100%' }}>
                      <tbody style={{ width: '100%' }}>
                        <tr style={{ width: '100%' }}>
                          <td style={{ width: '100%' }}></td>
                          <td>
                            <table style={{ width: 'auto' }}>
                              <tbody style={{ width: '100%' }}>
                                <tr style={{ width: '100%' }}>
                                  {socialMedia.x && (
                                    <td style={{ paddingLeft: '16px' }}>
                                      <Link href={socialMedia.x} style={{ width: 'max-content' }}>
                                        <Img
                                          src="https://res.cloudinary.com/diirhfihi/image/upload/fl_preserve_transparency/v1733578611/x_ihbm2m.jpg?_s=public-apps"
                                          alt="X"
                                          width={21}
                                          height={21}
                                          style={imgStyle}
                                        />
                                      </Link>
                                    </td>
                                  )}
                                  {socialMedia.instagram && (
                                    <td style={{ paddingLeft: '16px' }}>
                                      <Link
                                        href={socialMedia.instagram}
                                        style={{ width: 'max-content' }}>
                                        <Img
                                          src="https://res.cloudinary.com/diirhfihi/image/upload/fl_preserve_transparency/v1733578612/instagram_xojnll.jpg?_s=public-apps"
                                          alt="IG"
                                          width={21}
                                          height={21}
                                          style={imgStyle}
                                        />
                                      </Link>
                                    </td>
                                  )}
                                  {socialMedia.facebook && (
                                    <td style={{ paddingLeft: '16px' }}>
                                      <Link
                                        href={socialMedia.facebook}
                                        style={{ width: 'max-content' }}>
                                        <Img
                                          src="https://res.cloudinary.com/diirhfihi/image/upload/fl_preserve_transparency/v1733578613/facebook_1_hpoxjf.jpg?_s=public-apps"
                                          alt="FB"
                                          width={21}
                                          height={21}
                                          style={imgStyle}
                                        />
                                      </Link>
                                    </td>
                                  )}
                                  {socialMedia.tiktok && (
                                    <td style={{ paddingLeft: '16px' }}>
                                      <Link
                                        href={socialMedia.tiktok}
                                        style={{ width: 'max-content' }}>
                                        <Img
                                          src="https://res.cloudinary.com/diirhfihi/image/upload/fl_preserve_transparency/v1733578614/tiktok_qbyzet.jpg?_s=public-apps"
                                          alt="TK"
                                          width={21}
                                          height={21}
                                          style={imgStyle}
                                        />
                                      </Link>
                                    </td>
                                  )}
                                  {socialMedia.linkedin && (
                                    <td style={{ paddingLeft: '16px' }}>
                                      <Link
                                        href={socialMedia.linkedin}
                                        style={{ width: 'max-content' }}>
                                        <Img
                                          src="https://res.cloudinary.com/diirhfihi/image/upload/fl_preserve_transparency/v1733578614/tiktok_qbyzet.jpg?_s=public-apps"
                                          alt="LinkedIn"
                                          width={21}
                                          height={21}
                                          style={imgStyle}
                                        />
                                      </Link>
                                    </td>
                                  )}
                                </tr>
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </Box>
      </Box>
      <MulticolorBand />
    </Box>
  );
};

const footerWrapStyle: EmailStyle = {
  padding: '32px 32px 24px',
  gap: '32px',
  background: 'rgba(0, 0, 0, 0.15)',
};

const footerTextStyle: EmailStyle = {
  fontFamily: "'Inter', sans-serif",
  fontSize: '12px',
  fontWeight: 400,
  lineHeight: '20px',
  marginBottom: '32px',
};

const footerBottomWrapStyle: EmailStyle = {
  borderTop: '1px solid rgba(255, 255, 255, 0.07)',
  padding: '20px 0 0',
  width: '100%',
  maxWidth: '600px',
};

const imgStyle: EmailStyle = {
  margin: '0 auto',
  display: 'block',
  overflow: 'hidden',
  objectFit: 'cover',
};
