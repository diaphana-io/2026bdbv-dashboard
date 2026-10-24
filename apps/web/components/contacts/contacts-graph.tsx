"use client";

import { Card, CardContent, CardHeader } from "../ui/card";

type Contact = {
  visual_id: string;
  admin0_iso: string;
  exposure: { to_case_visual_id: string; intensity: string };
  followup: { status: string };
};

export function ContactsGraph({ contacts }: { contacts: Contact[] }) {
  const cases = Array.from(new Set(contacts.map((c) => c.exposure.to_case_visual_id)));

  return (
    <Card>
      <CardHeader className="text-sm font-semibold">Transmission links</CardHeader>
      <CardContent>
        <svg viewBox="0 0 640 220" className="h-56 w-full rounded-md bg-zinc-50">
          {cases.map((c, i) => {
            const x = 80 + i * 180;
            return (
              <g key={c}>
                <circle cx={x} cy={50} r={22} className="fill-zinc-900" />
                <text
                  x={x}
                  y={54}
                  textAnchor="middle"
                  className="fill-white text-[10px]"
                  style={{ fontSize: 10 }}
                >
                  {c.replace("-2026-", "-")}
                </text>
              </g>
            );
          })}
          {contacts.map((c, i) => {
            const caseIndex = cases.indexOf(c.exposure.to_case_visual_id);
            const x1 = 80 + caseIndex * 180;
            const x2 = 60 + (i % 6) * 100;
            const y2 = 150;
            return (
              <g key={c.visual_id}>
                <line
                  x1={x1}
                  y1={72}
                  x2={x2}
                  y2={y2 - 14}
                  className="stroke-zinc-400"
                  strokeWidth={1.5}
                />
                <circle
                  cx={x2}
                  cy={y2}
                  r={16}
                  className={
                    c.followup.status === "active" ? "fill-amber-500" : "fill-zinc-500"
                  }
                />
                <text
                  x={x2}
                  y={y2 + 4}
                  textAnchor="middle"
                  className="fill-white"
                  style={{ fontSize: 8 }}
                >
                  {c.visual_id.split("-").slice(-1)[0]}
                </text>
              </g>
            );
          })}
        </svg>
      </CardContent>
    </Card>
  );
}
