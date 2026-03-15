import React, { type ReactNode } from 'react';

interface BoxProps {
  classNames?: string[];
  styles?: Record<string, string | number | undefined>[];
  gap?: number;
  children?: ReactNode;
  style?: Record<string, string | number | undefined>;
  [key: string]: unknown;
}

export const Box = ({ classNames, styles, children, style, gap, ...props }: BoxProps) => {
  return (
    <div style={{ width: '100%', maxWidth: '600px', ...style }} {...props}>
      <table style={{ width: '100%' }}>
        {React.Children.toArray(children).map((child: ReactNode, idx: number, arr: ReactNode[]) => (
          <tr key={idx} style={{ width: '100%' }}>
            <td style={{ width: '100%' }}>
              <div
                style={{
                  width: '100%',
                  ...(child && gap && idx < arr.length - 1 ? { marginBottom: `${gap}px` } : {}),
                  ...(styles?.[idx] ?? {}),
                }}
                className={classNames?.[idx] || ''}>
                {child}
              </div>
            </td>
          </tr>
        ))}
      </table>
    </div>
  );
};
