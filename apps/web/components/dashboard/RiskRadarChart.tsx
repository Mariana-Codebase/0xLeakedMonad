"use client";

import { useEffect, useRef, useState } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer
} from "recharts";
import { type RadarAxis, scoreColor } from "../../lib/breachDashboard";

type Props = {
  axes: RadarAxis[];
};

export function RiskRadarChart({ axes }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const measure = () => {
      const h = el.getBoundingClientRect().height;
      if (h > 0) setHeight(Math.floor(h));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [axes]);

  const chartData = axes.map((ax) => ({
    ...ax,
    axisLabel: ax.axis.replace(/\n/g, " ")
  }));

  return (
    <div ref={wrapRef} className="cw-radar-chart-inner">
      {height > 0 ? (
        <ResponsiveContainer width="100%" height={height}>
          <RadarChart
            data={chartData}
            cx="50%"
            cy="50%"
            outerRadius="76%"
            margin={{ top: 16, right: 32, bottom: 16, left: 32 }}
          >
            <defs>
              <radialGradient id="cwRadarFill" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ff8800" stopOpacity={0.5} />
                <stop offset="60%" stopColor="#ff4444" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#ff0000" stopOpacity={0.1} />
              </radialGradient>
            </defs>
            <PolarGrid stroke="rgba(58,111,255,0.25)" />
            <PolarAngleAxis
              dataKey="axisLabel"
              tick={{ fill: "#5a80c0", fontSize: 13, fontFamily: "Rajdhani" }}
            />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
            <Radar
              name="Riesgo"
              dataKey="value"
              stroke="#ff6600"
              fill="url(#cwRadarFill)"
              strokeWidth={2}
              isAnimationActive={false}
              dot={(props) => {
                const { cx, cy, payload } = props as {
                  cx: number;
                  cy: number;
                  payload: { value: number };
                };
                if (cx == null || cy == null) return null;
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill={scoreColor(payload.value)}
                    stroke="#050a14"
                    strokeWidth={1}
                  />
                );
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      ) : null}
    </div>
  );
}
