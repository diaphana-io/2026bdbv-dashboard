"use client";

type Point = {
  id: string;
  lat: number;
  lon: number;
  classification: string;
  country: string;
};

/** Lightweight projection map (MapLibre can replace when tiles/token available). */
export function CaseMap({ points }: { points: Point[] }) {
  // Rough Africa-focused equirectangular window
  const minLon = 0;
  const maxLon = 45;
  const minLat = -5;
  const maxLat = 15;
  const w = 720;
  const h = 360;

  const project = (lon: number, lat: number) => {
    const x = ((lon - minLon) / (maxLon - minLon)) * w;
    const y = ((maxLat - lat) / (maxLat - minLat)) * h;
    return { x, y };
  };

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-[360px] w-full rounded-md bg-[#e8eef2]">
      <rect width={w} height={h} className="fill-[#e8eef2]" />
      <text x={12} y={24} style={{ fontSize: 12 }} className="fill-zinc-600">
        NG / KE / UG focus
      </text>
      {points.map((p) => {
        const { x, y } = project(p.lon, p.lat);
        const fill =
          p.classification === "confirmed"
            ? "#18181b"
            : p.classification === "suspected"
              ? "#d97706"
              : "#52525b";
        return (
          <g key={p.id}>
            <circle cx={x} cy={y} r={7} fill={fill} />
            <title>{`${p.id} · ${p.country} · ${p.classification}`}</title>
          </g>
        );
      })}
    </svg>
  );
}
