import type { Chart } from "./chart-spec";

// Where each mark goes. Pure arithmetic, so the drawing has no sums in it.

export const WIDTH = 640;
export const HEIGHT = 220;
const PAD = 8;
// Room on the left for the gridline values.
export const LEFT = 56;

// The next round number at or above a value: 7,269 gives 7,500.
function roundUp(value: number): number {
  if (value <= 0) return 0;
  const unit = 10 ** Math.floor(Math.log10(value));
  return (Math.ceil((value / unit) * 2) / 2) * unit;
}

// The scale always holds zero, so a small dip is never drawn as a collapse.
function scaleOf(points: Chart["points"]) {
  const top = roundUp(Math.max(...points.map((point) => point.y), 0));
  const bottom = 0 - roundUp(-Math.min(...points.map((point) => point.y), 0));
  const span = top - bottom || 1;
  return { top, bottom, place: (value: number) => PAD + ((top - value) / span) * (HEIGHT - PAD * 2) };
}

export function linePoints(points: Chart["points"]): { x: number; y: number }[] {
  const { place } = scaleOf(points);
  const step = (WIDTH - LEFT - PAD) / Math.max(points.length - 1, 1);
  return points.map((point, i) => ({ x: LEFT + i * step, y: place(point.y) }));
}

// Both axes are numbers, and both scales hold zero.
export function scatterPoints(points: Chart["points"]): { x: number; y: number }[] {
  const { place } = scaleOf(points);
  const across = points.map((point) => Number(point.x));
  const right = roundUp(Math.max(...across, 0));
  const left = 0 - roundUp(-Math.min(...across, 0));
  const width = (WIDTH - LEFT - PAD) / (right - left || 1);
  return points.map((point, i) => ({ x: LEFT + ((across[i] ?? 0) - left) * width, y: place(point.y) }));
}

// The gridlines: the two ends of the scale and the middle, plus zero where the values cross it.
export function lineTicks(points: Chart["points"]): { value: number; y: number }[] {
  const { top, bottom, place } = scaleOf(points);
  const values = new Set([top, (top + bottom) / 2, bottom, 0]);
  return [...values].map((value) => ({ value, y: place(value) }));
}

// Each slice of a pie as an SVG path on a circle of radius 100 around 0,0.
export function slices(points: Chart["points"]): { d: string; share: number }[] {
  const total = points.reduce((sum, point) => sum + point.y, 0) || 1;
  let turned = -0.25;
  return points.map((point) => {
    const share = point.y / total;
    const [from, to] = [turned, turned + Math.min(share, 0.9999)];
    turned += share;
    const at = (turn: number) =>
      `${(100 * Math.cos(turn * 2 * Math.PI)).toFixed(2)} ${(100 * Math.sin(turn * 2 * Math.PI)).toFixed(2)}`;
    return { d: `M0 0 L${at(from)} A100 100 0 ${share > 0.5 ? 1 : 0} 1 ${at(to)} Z`, share };
  });
}
