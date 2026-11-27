"use client";

import { useState } from "react";
import { HEIGHT, LEFT, linePoints, lineTicks, scatterPoints, slices, WIDTH } from "../rules/chart-geometry";
import type { Chart } from "../rules/chart-spec";

// Draws the chart the agent chose, from rows the query returned. The same rows are in the table below.

const format = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });

function Bars({ chart }: { chart: Chart }) {
  const top = Math.max(...chart.points.map((point) => Math.abs(point.y)), 0) || 1;
  return (
    <ul className="bars">
      {chart.points.map((point) => (
        <li key={point.x}>
          <span className="bar-label" title={point.x}>
            {point.x.replace(/_/g, " ")}
          </span>
          <span className="bar-track">
            <span className="bar" style={{ width: `${(Math.abs(point.y) / top) * 100}%` }} />
          </span>
          <span className="bar-value">{format(point.y)}</span>
        </li>
      ))}
    </ul>
  );
}

function Line({ chart }: { chart: Chart }) {
  const [at, setAt] = useState(chart.points.length - 1);
  const places = linePoints(chart.points);
  const point = chart.points[at] ?? chart.points[0];
  return (
    <>
      <p className="chart-readout">
        <strong>{format(point?.y ?? 0)}</strong> {point?.x}
      </p>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="line-chart" aria-hidden="true">
        <Gridlines chart={chart} />
        <polyline points={places.map((p) => `${p.x},${p.y}`).join(" ")} />
        {places.map((place, i) => (
          // biome-ignore lint/a11y/noStaticElementInteractions: hover only reads out a value in the table
          <g key={chart.points[i]?.x} onMouseEnter={() => setAt(i)}>
            <circle cx={place.x} cy={place.y} r={14} className="hit" />
            <circle cx={place.x} cy={place.y} r={i === at ? 6 : 4} className="dot" />
          </g>
        ))}
      </svg>
      <p className="chart-ends" style={{ paddingLeft: `${(LEFT / WIDTH) * 100}%` }}>
        <span>{chart.points[0]?.x}</span>
        <span>{chart.points.at(-1)?.x}</span>
      </p>
    </>
  );
}

function Gridlines({ chart }: { chart: Chart }) {
  return lineTicks(chart.points).map((tick) => (
    <g key={tick.value} className="tick">
      <line x1={LEFT} x2={WIDTH} y1={tick.y} y2={tick.y} />
      <text x={LEFT - 10} y={tick.y}>
        {format(tick.value)}
      </text>
    </g>
  ));
}

function Scatter({ chart }: { chart: Chart }) {
  const places = scatterPoints(chart.points);
  const across = chart.points.map((point) => Number(point.x));
  return (
    <>
      <p className="chart-readout">
        {chart.yLabel} against {chart.xLabel}
      </p>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="line-chart" aria-hidden="true">
        <Gridlines chart={chart} />
        {places.map((place, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: two points may share both values
          <circle key={i} cx={place.x} cy={place.y} r={4} className="dot" />
        ))}
      </svg>
      <p className="chart-ends" style={{ paddingLeft: `${(LEFT / WIDTH) * 100}%` }}>
        <span>{format(Math.min(...across, 0))}</span>
        <span>{format(Math.max(...across, 0))}</span>
      </p>
    </>
  );
}

function Pie({ chart }: { chart: Chart }) {
  const parts = slices(chart.points);
  return (
    <div className="pie">
      <svg viewBox="-102 -102 204 204" className="pie-drawing" aria-hidden="true">
        {parts.map((part, i) => (
          <path key={chart.points[i]?.x} d={part.d} className={`slice series-${i + 1}`} />
        ))}
      </svg>
      <ul className="pie-list">
        {chart.points.map((point, i) => (
          <li key={point.x} className="pie-row">
            <span className={`swatch series-${i + 1}`} aria-hidden="true" />
            {point.x.replace(/_/g, " ")}
            <strong>{format(point.y)}</strong>
            <span>{Math.round((parts[i]?.share ?? 0) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const DRAW = { bar: Bars, line: Line, pie: Pie, scatter: Scatter };

export function ChartView({ chart }: { chart: Chart }) {
  const Drawing = DRAW[chart.kind];
  return (
    <figure className="chart">
      <figcaption>{chart.title}</figcaption>
      <Drawing chart={chart} />
    </figure>
  );
}
