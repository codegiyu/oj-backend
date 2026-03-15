import { Heading, Img } from '@react-email/components';
import { Box } from './Box';
import type { EmailStyle } from './types';

interface GreetingProps {
  name: string;
  avatar: string;
}

export const Greeting = ({ name, avatar }: GreetingProps) => {
  return (
    <Box
      style={{
        ...greetingWrapperStyle,
      }}>
      <div style={{ padding: '20px 32px 0' }}>
        <Img src={avatar} alt={name} width={60} height={60} style={avatarStyle} />
      </div>

      <Box style={greetingBottomWrapStyle}>
        <Heading className="text-d-80 dark:text-black" style={greetingTextStyle}>
          Hello, {name},
        </Heading>
      </Box>
    </Box>
  );
};

const greetingWrapperStyle: EmailStyle = {
  borderBottom: '1px solid rgba(0, 0, 0, 0.07)',
  width: '100%',
  maxWidth: '600px',
};

const avatarStyle: EmailStyle = {
  margin: '0 auto',
  display: 'block',
  borderRadius: '999px',
  aspectRatio: '1',
  overflow: 'hidden',
  objectFit: 'cover',
};

const greetingBottomWrapStyle: EmailStyle = {
  padding: '24px 32px 44px',
};

const greetingTextStyle: EmailStyle = {
  fontSize: '30px',
  fontWeight: 500,
  lineHeight: '110%',
  letterSpacing: '-0.6px',
  textAlign: 'center',
};
