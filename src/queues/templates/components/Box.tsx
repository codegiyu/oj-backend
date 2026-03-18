import React, { type ReactNode } from 'react';

interface BoxProps {
  classNames?: string[];
  styles?: Record<string, string | number | undefined>[];
  gap?: number;
  children?: ReactNode;
  style?: Record<string, string | number | undefined>;
  [key: string]: unknown;
}

export const Box = ({ classNames, styles, children, style, gap, ...props }: BoxProps): JSX.Element => {
  const childrenArray = React.Children.toArray(children) as unknown[];
  return (
    <div style={{ width: '100%', maxWidth: '600px', ...style }} {...props}>
      <table style={{ width: '100%' }}>
        {childrenArray.map((child, idx) => (
          <tr key={idx} style={{ width: '100%' }}>
            <td style={{ width: '100%' }}>
              <div
                style={{
                  width: '100%',
                  ...(child && gap && idx < childrenArray.length - 1
                    ? { marginBottom: `${gap}px` }
                    : {}),
                  ...(styles?.[idx] ?? {}),
                }}
                className={classNames?.[idx] || ''}>
                {child as any}
              </div>
            </td>
          </tr>
        ))}
      </table>
    </div>
  );
};
