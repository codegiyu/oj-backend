import { Heading } from '@react-email/components';
import type { EmailStyle } from './types';

export interface TextBlockProps {
  paragraphs: { type: 'heading' | 'text'; content: string }[];
}

export const TextBlock = ({ paragraphs }: TextBlockProps) => {
  return (
    <div className="text-d-70">
      {paragraphs.map((item, idx, arr) =>
        item.type === 'heading' ? (
          <Heading key={idx} style={headingStyle}>
            {item.content}
          </Heading>
        ) : (
          <div key={idx}>
            <p style={paragraphStyle}>{item.content}</p>
            {idx < arr.length - 1 && <br />}
          </div>
        )
      )}
    </div>
  );
};

export const paragraphStyle: EmailStyle = {
  fontSize: '14px',
  fontWeight: 400,
  lineHeight: '21px',
};

const headingStyle: EmailStyle = {
  ...paragraphStyle,
  fontWeight: 700,
};
