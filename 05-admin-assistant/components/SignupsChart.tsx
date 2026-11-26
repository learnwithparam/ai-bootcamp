import type { DayCount } from "../rules/days";

// A bar per day, drawn as SVG. No chart library: 30 bars and two labels do not need one.
const WIDTH = 600;
const HEIGHT = 160;
const AXIS = 20;

function shortDay(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function Bar({
  day,
  index,
  slot,
  most,
  labelled,
}: {
  day: DayCount;
  index: number;
  slot: number;
  most: number;
  labelled: boolean;
}) {
  const height = (day.signups / most) * (HEIGHT - 16);
  return (
    <g>
      <rect
        className="bar"
        x={index * slot + slot * 0.15}
        y={HEIGHT - height}
        width={slot * 0.7}
        height={height}
      >
        <title>{`${shortDay(day.day)}: ${day.signups}`}</title>
      </rect>
      {labelled && day.signups > 0 ? (
        <text className="bar-value" x={index * slot + slot / 2} y={HEIGHT - height - 4} textAnchor="middle">
          {day.signups}
        </text>
      ) : null}
    </g>
  );
}

function Axis({ first, last }: { first?: DayCount; last?: DayCount }) {
  return (
    <>
      <line className="axis" x1={0} x2={WIDTH} y1={HEIGHT} y2={HEIGHT} />
      {first ? (
        <text className="axis-label" x={0} y={HEIGHT + 15}>
          {shortDay(first.day)}
        </text>
      ) : null}
      {last ? (
        <text className="axis-label" x={WIDTH} y={HEIGHT + 15} textAnchor="end">
          {shortDay(last.day)}
        </text>
      ) : null}
    </>
  );
}

export function SignupsChart({ days }: { days: DayCount[] }) {
  const most = Math.max(1, ...days.map((day) => day.signups));
  const slot = WIDTH / days.length;
  return (
    <svg className="chart" viewBox={`0 0 ${WIDTH} ${HEIGHT + AXIS}`} role="img" aria-label="Signups per day">
      {days.map((day, index) => (
        <Bar key={day.day} day={day} index={index} slot={slot} most={most} labelled={days.length <= 14} />
      ))}
      <Axis first={days[0]} last={days.at(-1)} />
    </svg>
  );
}
