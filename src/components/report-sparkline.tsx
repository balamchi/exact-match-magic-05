interface Props {
  values: number[];
  width?: number;
  height?: number;
  stroke?: string;
  className?: string;
}

export function ReportSparkline({ values, width = 96, height = 28, stroke = "currentColor", className }: Props) {
  if (!values.length) return <div style={{ width, height }} className={className} />;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const step = width / Math.max(values.length - 1, 1);
  const points = values
    .map((v, i) => `${i * step},${height - ((v - min) / range) * (height - 2) - 1}`)
    .join(" ");
  return (
    <svg width={width} height={height} className={className} viewBox={`0 0 ${width} ${height}`}>
      <polyline fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
}
