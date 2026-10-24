"use client";

type Props = {
  min: string;
  max: string;
  value: string;
  onChange: (date: string) => void;
};

function daysBetween(a: string, b: string): number {
  const ms = Date.parse(b) - Date.parse(a);
  return Math.max(0, Math.round(ms / 86400000));
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function TimeSlider({ min, max, value, onChange }: Props) {
  const span = daysBetween(min, max);
  const current = daysBetween(min, value);

  return (
    <div className="pointer-events-auto w-full max-w-xl rounded-md border border-border bg-card/95 px-3 py-2 shadow-sm backdrop-blur">
      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
        <span>{min}</span>
        <span className="font-medium text-foreground">{value}</span>
        <span>{max}</span>
      </div>
      <input
        type="range"
        min={0}
        max={span}
        value={current}
        aria-label="Outbreak date"
        className="w-full accent-foreground"
        onChange={(e) => onChange(addDays(min, Number(e.target.value)))}
      />
    </div>
  );
}
