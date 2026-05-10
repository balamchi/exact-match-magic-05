interface Props {
  // matrix[row][col] = value; rows usually days of week, cols hours
  matrix: number[][];
  rowLabels: string[];
  colLabels: string[];
  formatValue?: (v: number) => string;
}

export function ReportHeatmap({ matrix, rowLabels, colLabels, formatValue }: Props) {
  const max = Math.max(1, ...matrix.flat());
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-1 text-[10px]">
        <thead>
          <tr>
            <th className="w-10" />
            {colLabels.map((c) => (
              <th key={c} className="px-1 font-normal text-muted-foreground">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, ri) => (
            <tr key={rowLabels[ri]}>
              <td className="pr-2 text-right text-muted-foreground">{rowLabels[ri]}</td>
              {row.map((v, ci) => {
                const intensity = v / max;
                const bg = v === 0 ? "hsl(var(--muted))" : `color-mix(in oklab, hsl(var(--primary)) ${Math.round(intensity * 90 + 10)}%, transparent)`;
                return (
                  <td
                    key={ci}
                    title={`${rowLabels[ri]} ${colLabels[ci]}: ${formatValue ? formatValue(v) : v}`}
                    style={{ background: bg }}
                    className="h-6 min-w-5 rounded text-center text-foreground"
                  >
                    {v > 0 && intensity > 0.6 ? (formatValue ? formatValue(v) : v) : ""}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
