/** Format seconds to "Xh Ym" */
export function fmtDuration(seconds: number): string {
  if (seconds <= 0) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Colour bucket for utilisation percentage */
export function utilColour(pct: number): string {
  if (pct >= 75) return '#10b981';
  if (pct >= 50) return '#f59e0b';
  return '#ef4444';
}

/** Badge variant for utilisation */
export function utilBadge(pct: number): string {
  if (pct >= 75) return 'badge-green';
  if (pct >= 50) return 'badge-yellow';
  return 'badge-red';
}

/** Round to 1 decimal */
export function r1(n: number): string {
  return n.toFixed(1);
}

/** Format large numbers with commas */
export function fmtNum(n: number): string {
  return n.toLocaleString();
}
