export function clamp(val: number, min: number, max: number) {
  return Math.min(Math.max(val, min), max);
}

export function lerp(start: number, end: number, amt: number) {
  return (1 - amt) * start + amt * end;
}

export function mapRange(val: number, inMin: number, inMax: number, outMin: number, outMax: number) {
  const clampedVal = clamp(val, inMin, inMax);
  if (inMax === inMin) return outMax;
  const ratio = (clampedVal - inMin) / (inMax - inMin);
  return outMin + ratio * (outMax - outMin);
}
