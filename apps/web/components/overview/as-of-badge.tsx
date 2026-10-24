export function AsOfBadge({ date }: { date: string }) {
  return (
    <span className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-700">
      as-of {date}
    </span>
  );
}
