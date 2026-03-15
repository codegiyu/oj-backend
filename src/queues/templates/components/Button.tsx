import { Link } from '@react-email/components';

export interface ButtonProps {
  text: string;
  href: string;
  short?: boolean;
}

export const Button = ({ text, href, short = false }: ButtonProps) => {
  return (
    <Link href={href}>
      <button
        style={{
          width: short ? 'fit-content' : '100%',
          padding: '14px 16px',
          background: '#000',
          border: '1px solid rgba(0, 0, 0, 0.24)',
          borderRadius: '100px',
          fontSize: '14px',
          lineHeight: '24px',
          fontWeight: '500',
          color: '#fff',
          fontFamily: "'Inter', sans-serif",
        }}>
        {text}
      </button>
    </Link>
  );
};
