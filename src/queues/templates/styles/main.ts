export const main = {
  backgroundColor: '#f3a765ff',
  fontFamily: '"Comfortaa", Arial, sans-serif',
  padding: '40px 0',
  margin: '0',
};

export const container = {
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  maxWidth: '600px',
  margin: '0 auto',
  padding: '20px',
  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
};

export const box = {
  textAlign: 'center' as const,
};

export const hr = {
  border: 'none',
  borderTop: '1px solid #e6ebf1',
  margin: '20px 0',
};

export const headerText = {
  fontSize: '24px',
  color: '#fe7702',
  margin: '20px 0 10px',
  fontWeight: 'bold',
};

export const paragraph = {
  color: '#525f7f',
  fontSize: '16px',
  lineHeight: '1.5',
  margin: '10px 0',
};

export const note = {
  color: '#8898aa',
  fontSize: '14px',
  lineHeight: '1.5',
  marginTop: '10px',
};

export const signature = {
  color: '#525f7f',
  fontSize: '16px',
  lineHeight: '1.5',
  marginTop: '20px',
};

export const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '1.5',
  marginTop: '20px',
};

export const anchor = {
  color: '#fe7702',
  textDecoration: 'none',
};

export const button = {
  backgroundColor: '#fe7702',
  borderRadius: '25px',
  color: '#ffffff',
  fontSize: '18px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  width: '80%',
  maxWidth: '300px',
  padding: '15px',
  margin: '20px auto 0',
  cursor: 'pointer',
};

export const responsiveStyles = `
  @media only screen and (max-width: 600px) {
    body {
      padding: 20px 0 !important;
    }
    .container {
      margin: 0 auto !important;
      width: 90% !important;
      padding: 15px !important;
    }
    .button {
      width: 100% 
    }
  }
`;
