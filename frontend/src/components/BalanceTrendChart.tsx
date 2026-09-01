interface Props {
  data: { date: string; liquidAssets: number }[];
}

export function BalanceTrendChart({ data }: Props) {
  if (data.length < 2) return null;

  const width = 600;
  const height = 140;
  const padding = 8;

  const values = data.map((d) => d.liquidAssets);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((d.liquidAssets - min) / range) * (height - padding * 2);
    return { x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${height - padding} L ${points[0].x.toFixed(1)} ${height - padding} Z`;

  return (
    <div className="trend-chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none">
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#453868" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#453868" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#trendFill)" />
        <path d={linePath} fill="none" stroke="#453868" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <div className="trend-chart-labels">
        <span>{data[0].date}</span>
        <span className="trend-chart-note">
          ${min.toFixed(0)} – ${max.toFixed(0)} over {data.length} days (reconstructed from transaction history)
        </span>
        <span>{data[data.length - 1].date}</span>
      </div>
    </div>
  );
}
