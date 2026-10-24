"use client";

export function ResolveConflictActions({
  onResolve,
  disabled,
}: {
  onResolve: (status: "resolved_a" | "resolved_b" | "resolved_neither") => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        disabled={disabled}
        className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-50"
        onClick={() => onResolve("resolved_a")}
      >
        Keep A
      </button>
      <button
        type="button"
        disabled={disabled}
        className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-50"
        onClick={() => onResolve("resolved_b")}
      >
        Keep B
      </button>
      <button
        type="button"
        disabled={disabled}
        className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-50"
        onClick={() => onResolve("resolved_neither")}
      >
        Keep neither
      </button>
    </div>
  );
}
