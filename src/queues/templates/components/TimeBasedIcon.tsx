import { Img } from '@react-email/components';
import type { EmailStyle } from './types';

interface TimeBasedIconProps {
  timePeriod: 'Morning' | 'Afternoon' | 'Evening';
  className?: string;
  style?: EmailStyle;
}

export const TimeBasedIcon = ({ timePeriod, className, style }: TimeBasedIconProps) => {
  return (
    <div className={className} style={style}>
      {timePeriod === 'Morning' ? (
        <Img
          src="https://res.cloudinary.com/diirhfihi/image/upload/fl_preserve_transparency/v1733578615/sunrise_tiojtc.jpg?_s=public-apps"
          alt="mn"
          width={18}
          height={18}
          style={imgStyle}
        />
      ) : timePeriod === 'Afternoon' ? (
        <Img
          src="https://res.cloudinary.com/diirhfihi/image/upload/fl_preserve_transparency/v1733578616/sun_bo6km5.jpg?_s=public-apps"
          alt="af"
          width={18}
          height={18}
          style={imgStyle}
        />
      ) : (
        <Img
          src="https://res.cloudinary.com/diirhfihi/image/upload/fl_preserve_transparency/v1733578617/moon_prww59.jpg?_s=public-apps"
          alt="ev"
          width={18}
          height={18}
          style={imgStyle}
        />
      )}
    </div>
  );
};

const imgStyle: EmailStyle = {
  margin: '0 auto',
  display: 'block',
  overflow: 'hidden',
  objectFit: 'cover',
};
