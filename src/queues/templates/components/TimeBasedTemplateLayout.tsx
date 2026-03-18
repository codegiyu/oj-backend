import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Tailwind,
} from '@react-email/components';
import type { EmailStyle } from './types';
import { Box } from './Box';
import { Button, type ButtonProps } from './Button';
import { CenterText, type CenterTextProps } from './CenterText';
import { CodeOrLinkDisplay, type CodeOrLinkDisplayProps } from './CodeOrLinkDisplay';
import { Footer } from './Footer';
import { Greeting } from './Greeting';
import { Header } from './Header';
import type { EmailBranding } from './Header';
import { PairTable, type PairTableProps } from './PairTable';
import { TextBlock, type TextBlockProps } from './TextBlock';

type ValidComponent =
  | {
      type: 'button';
      props: ButtonProps;
    }
  | {
      type: 'textBlock';
      props: TextBlockProps;
    }
  | {
      type: 'centerText';
      props: CenterTextProps;
    }
  | {
      type: 'pairTable';
      props: PairTableProps;
    }
  | {
      type: 'codeOrLinkDisplay';
      props: CodeOrLinkDisplayProps;
    };

export interface TemplateLayoutProps {
  preview?: string;
  name: string;
  to: string;
  avatar?: string;
  bannerUrl?: string;
  heading: string;
  contentsArr: ValidComponent[];
  code?: string;
  branding: EmailBranding;
}

export const TemplateLayout = ({
  preview,
  name,
  to,
  avatar,
  bannerUrl = '',
  heading,
  contentsArr,
  code,
  branding,
}: TemplateLayoutProps) => {
  const TailwindWrapper = Tailwind as any;
  return (
    <TailwindWrapper>
      <Html>
        <Head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link
            href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap"
            rel="stylesheet"
          />
          <link
            href="https://db.onlinewebfonts.com/c/08e020de1811ec4489f82d1247a42c09?family=Helvetica+Now+Text"
            rel="stylesheet"
          />
          <style>{responsiveStyles}</style>
          {code && <meta name="format-detection" content="one-time-code" />}
        </Head>
        {preview && <Preview>{preview}</Preview>}
        <Body className="bg-[#f7f7f7]">
          <Container
            style={{
              borderRadius: '10px',
              overflow: 'hidden',
              width: '100%',
              maxWidth: '600px',
              margin: '0 auto',
              padding: '0',
            }}>
            <Header branding={branding} />
            <Greeting
              name={name}
              avatar={avatar || 'https://i.postimg.cc/RZgGRrFd/empty-avatar.png'}
            />
            <Box className="main-wrap" gap={24}>
              {bannerUrl && <Img src={bannerUrl} alt={heading} style={bannerStyle} />}
              <Heading className="text-d-100" style={headingStyle}>
                {heading}
              </Heading>

              {contentsArr.map((item, idx) => {
                const { type, props } = item;
                const el =
                  type === 'button' ? <Button {...(props as ButtonProps)} /> :
                  type === 'centerText' ? <CenterText {...(props as CenterTextProps)} /> :
                  type === 'textBlock' ? <TextBlock {...(props as TextBlockProps)} /> :
                  type === 'pairTable' ? <PairTable {...(props as PairTableProps)} /> :
                  <CodeOrLinkDisplay {...(props as CodeOrLinkDisplayProps)} />;
                return <div key={idx} style={{ display: 'contents' }}>{el}</div>;
              })}

              <p className="text-d-70" style={endGreetingsTextStyle}>
                Cheers,
                <br />
                ❤️
              </p>
            </Box>
            <Footer email={to} branding={branding} />
          </Container>
        </Body>
      </Html>
    </TailwindWrapper>
  );
};

const responsiveStyles = `
  /* CLIENT-SPECIFIC STYLES */
  body,
  table,
  td,
  a {
    -webkit-text-size-adjust: 100%;
    -ms-text-size-adjust: 100%;
  }

  table,
  td {
    mso-table-lspace: 0pt;
    mso-table-rspace: 0pt;
  }
  img {
    -ms-interpolation-mode: bicubic;
  }  
  
  /* Resets */
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  img {
    border: 0;
    outline: none;
    text-decoration: none;
  }
  table {
    border-collapse: collapse !important;
  }

  /* iOS BLUE LINKS */
  a[x-apple-data-detectors] {
    color: inherit !important;
    text-decoration: none !important;
    font-size: inherit !important;
    font-family: inherit !important;
    font-weight: inherit !important;
    line-height: inherit !important;
  }

  /* ANDROID CENTER FIX */
  div[style*="margin: 16px 0;"] {
    margin: 0 !important;
  }

  /* Colour classes */
  .bg-bg {
    background: #F7F7F7 !important;
  }
  .bg-d-100 {
    color: rgb(10, 10, 10) !important;
  }

  .text-d-40 {
    color: rgba(10, 10, 10, 0.40) !important;
  }
  .text-d-50 {
    color: rgba(10, 10, 10, 0.50) !important;
  }
  .text-d-60 {
    color: rgba(10, 10, 10, 0.60) !important;
  }
  .text-d-70 {
    color: rgba(10, 10, 10, 0.70) !important;
  }
  .text-d-80 {
    color: rgba(10, 10, 10, 0.80) !important;
  }
  .text-d-90 {
    color: rgba(10, 10, 10, 0.90) !important;
  }
  .text-d-100 {
    color: rgba(10, 10, 10) !important;
  }
  .text-r-100 {
    color: rgb(245, 245, 245) !important;
  }
  .text-sw-100 {
    color: rgb(245, 245, 245) !important;
  }
  .text-sw-50 {
    color: rgba(245, 245, 245, 0.50) !important;
  }

  .border-d-7 {
    border-color: rgba(10, 10, 10, 0.07) !important;
  }

  /* Utility classes */
  .mobile-only {}
  .desktop-only {
    display: none;
  }

  .light-mode {
    display: block;
  }

  .dark-mode {
    display: none;
  }

  :root {
    color-scheme: light dark;
  }

  body {
    font-family: 'Helvetica Now Text', sans-serif;
    padding: 32px 16px;
    min-height: 100vh;
    height: auto;
    color: rgba(0, 0, 0, 0.9);
  }

  .main-wrap {
    padding: 16px 12px;
  }

  /* Styling specially for bigger screens....semi-tablets and above */
  @media only screen and (min-width: 600px) {
    .mobile-only {
      display: none;
    }
    .desktop-only {
      display: block;
    }

    body {
      padding: 32px;
    }
    .main-wrap {
      padding: 16px 32px;
    }
  }
`;

const bannerStyle: EmailStyle = {
  width: '100%',
  borderRadius: '12px',
  overflow: 'hidden',
};

const headingStyle: EmailStyle = {
  fontSize: '20px',
  fontWeight: 500,
  lineHeight: '30px',
};

const endGreetingsTextStyle: EmailStyle = {
  fontSize: '14px',
  fontWeight: 400,
  lineHeight: '21px',
  margin: '0',
};
