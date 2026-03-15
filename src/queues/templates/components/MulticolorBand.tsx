export const MulticolorBand = () => {
  const backgrounds = ['#fe7702', '#fe7702', '#fe7702', '#fe7702', '#fe7702'];

  return (
    <table style={{ width: '100%', maxWidth: '600px' }}>
      <tbody style={{ width: '100%' }}>
        <tr style={{ width: '100%' }}>
          {backgrounds.map(item => (
            <td
              key={item}
              style={{
                backgroundColor: item,
                height: '8px',
                width: '20%',
              }}></td>
          ))}
        </tr>
      </tbody>
    </table>
  );
};
