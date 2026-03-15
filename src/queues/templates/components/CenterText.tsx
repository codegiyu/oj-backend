import { paragraphStyle } from './TextBlock';

export interface CenterTextProps {
  content: string;
}

export const CenterText = ({ content }: CenterTextProps) => {
  return <p style={{ ...paragraphStyle, textAlign: 'center' }}>{content}</p>;
};
