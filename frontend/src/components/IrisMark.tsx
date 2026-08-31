export function IrisMark({ size = 22, color = "currentColor" }: { size?: number; color?: string }) {
  // A camera-iris / eye-iris motif: blades angled around a center point —
  // the thing that focuses scattered light into one point, same job
  // this product does for scattered spending.
  const bladeCount = 7;
  const c = size / 2;
  const outer = c - 1;
  const inner = size * 0.16;

  const blades = Array.from({ length: bladeCount }).map((_, i) => {
    const a0 = (360 / bladeCount) * i;
    const a1 = a0 + 360 / bladeCount;
    const rad0 = (a0 * Math.PI) / 180;
    const rad1 = (a1 * Math.PI) / 180;
    const x0 = c + outer * Math.cos(rad0);
    const y0 = c + outer * Math.sin(rad0);
    const x1 = c + outer * Math.cos(rad1);
    const y1 = c + outer * Math.sin(rad1);
    const ix = c + inner * Math.cos((rad0 + rad1) / 2);
    const iy = c + inner * Math.sin((rad0 + rad1) / 2);
    return `${x0},${y0} ${ix},${iy} ${x1},${y1}`;
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" aria-hidden="true">
      <circle cx={c} cy={c} r={outer} stroke={color} strokeOpacity={0.3} />
      {blades.map((points, i) => (
        <polygon key={i} points={points} fill={color} fillOpacity={0.88} />
      ))}
      <circle cx={c} cy={c} r={inner * 0.7} fill={color} />
    </svg>
  );
}
