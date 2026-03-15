import type { EmailStyle } from './types';

export interface PairTableProps {
  pairs: [string, string][];
}

export const PairTable = ({ pairs }: PairTableProps) => {
  return (
    <div
      style={{
        borderRadius: '12px',
        overflow: 'hidden',
        background: 'rgba(0, 0, 0, 0.03)',
      }}>
      {pairs.map(([title, value], idx, arr) => (
        <table key={idx} style={{ width: '100%', maxWidth: '600px' }}>
          <tbody style={{ width: '100%' }}>
            <tr
              style={{
                width: '100%',
                ...(idx < arr.length - 1 && {
                  borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
                }),
              }}>
              <td style={{ textAlign: 'left', padding: '16px' }}>
                <p className="text-d-100" style={{ ...textStyle }}>
                  {title}
                </p>
              </td>
              <td style={{ textAlign: 'right', padding: '16px' }}>
                <p className="text-d-90" style={{ ...textStyle, fontWeight: '500' }}>
                  {value}
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      ))}
    </div>
  );
};

const textStyle: EmailStyle = {
  fontSize: '14px',
  fontWeight: 400,
  lineHeight: '14px',
  letterSpacing: '-0.28px',
};
