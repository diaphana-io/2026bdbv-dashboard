import { Badge } from "@/components/ui/badge";
import type { DuplicateLevel } from "@/lib/data-types";

const LABELS: Record<DuplicateLevel, string> = {
  none: "New",
  exact_url: "Exact URL",
  content_hash: "Same content",
  possible: "Possible dup",
};

export function DuplicateLevelBadge({
  level = "none",
}: {
  level?: DuplicateLevel | string | null;
}) {
  const normalized = (level ?? "none") as DuplicateLevel;
  const known = normalized in LABELS ? normalized : ("none" as const);
  const variant =
    known === "exact_url" || known === "content_hash"
      ? "warning"
      : known === "possible"
        ? "secondary"
        : "outline";

  return <Badge variant={variant}>{LABELS[known]}</Badge>;
}
