"use client";

export type ChartDataPoint = {
  week: string;
  rank: number;
  total: number;
  workoutTitle: string;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatWeekLabel(dateStr: string): string {
  const [, m, d] = dateStr.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}`;
}

export function PositionChart({ data }: { data: ChartDataPoint[] }) {
  if (data.length === 0) return null;

  const vW = 560;
  const vH = 200;
  const padL = 36;
  const padR = 16;
  const padT = 16;
  const padB = 36;
  const cW = vW - padL - padR;
  const cH = vH - padT - padB;

  const maxRank = Math.max(...data.map((d) => d.total), 2);

  const xOf = (i: number) =>
    data.length === 1 ? padL + cW / 2 : padL + (i / (data.length - 1)) * cW;

  const yOf = (rank: number) =>
    maxRank <= 1 ? padT + cH / 2 : padT + ((rank - 1) / (maxRank - 1)) * cH;

  const points = data.map((d, i) => ({ x: xOf(i), y: yOf(d.rank), ...d }));

  const pathD =
    points.length > 1
      ? points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ")
      : "";

  const yTickCount = Math.min(maxRank, 6);
  const yTicks = [
    ...new Set(
      Array.from({ length: yTickCount }, (_, i) =>
        yTickCount === 1 ? 1 : Math.round(1 + (i / (yTickCount - 1)) * (maxRank - 1))
      )
    ),
  ];

  const xLabelStep = Math.max(1, Math.ceil(data.length / 6));

  return (
    <svg
      viewBox={`0 0 ${vW} ${vH}`}
      className="w-full"
      role="img"
      aria-label="Finishing position over time"
    >
      {/* Horizontal grid lines */}
      {yTicks.map((tick) => (
        <line
          key={tick}
          x1={padL}
          x2={padL + cW}
          y1={yOf(tick).toFixed(1)}
          y2={yOf(tick).toFixed(1)}
          className="stroke-zinc-200 dark:stroke-zinc-800"
          strokeWidth={1}
        />
      ))}

      {/* Y axis labels */}
      {yTicks.map((tick) => (
        <text
          key={tick}
          x={padL - 6}
          y={yOf(tick).toFixed(1)}
          textAnchor="end"
          dominantBaseline="middle"
          fontSize={10}
          className="fill-zinc-400"
        >
          {tick}
        </text>
      ))}

      {/* X axis labels */}
      {data.map((d, i) => {
        if (i % xLabelStep !== 0 && i !== data.length - 1) return null;
        return (
          <text
            key={d.week}
            x={xOf(i).toFixed(1)}
            y={vH - padB + 14}
            textAnchor="middle"
            fontSize={9}
            className="fill-zinc-400"
          >
            {formatWeekLabel(d.week)}
          </text>
        );
      })}

      {/* Line */}
      {pathD && (
        <path
          d={pathD}
          fill="none"
          className="stroke-zinc-900 dark:stroke-white"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}

      {/* Dots */}
      {points.map((p, i) => (
        <g key={i}>
          {p.rank === 1 && (
            <circle
              cx={p.x.toFixed(1)}
              cy={p.y.toFixed(1)}
              r={7}
              className="fill-amber-400 opacity-30"
            />
          )}
          <circle
            cx={p.x.toFixed(1)}
            cy={p.y.toFixed(1)}
            r={4}
            className={
              p.rank === 1
                ? "fill-amber-400"
                : p.rank <= 3
                  ? "fill-zinc-500 dark:fill-zinc-400"
                  : "fill-zinc-300 dark:fill-zinc-600"
            }
          >
            <title>{`${formatWeekLabel(p.week)}: ${p.rank === 1 ? "1st" : p.rank === 2 ? "2nd" : p.rank === 3 ? "3rd" : `${p.rank}th`} of ${p.total}`}</title>
          </circle>
        </g>
      ))}
    </svg>
  );
}
