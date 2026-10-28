"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { withBasePath } from "@/lib/base-path";
import { curateApiPath } from "@/lib/curate-surface";
import type { CatalogClaimRow } from "@/lib/data-types";

export function RollbackClaimDialog({
  head,
  lineageVersions,
}: {
  head: CatalogClaimRow;
  lineageVersions: CatalogClaimRow[];
}) {
  const priors = useMemo(
    () =>
      lineageVersions
        .filter((c) => c.id !== head.id && c.version < head.version)
        .sort((a, b) => b.version - a.version),
    [head.id, head.version, lineageVersions],
  );

  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [targetId, setTargetId] = useState<string>("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const canSubmit = reason.trim().length > 0 && !pending;

  async function onSubmit() {
    if (!canSubmit) return;
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(withBasePath(curateApiPath("rollback-claim")), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          claim_id: head.id,
          target_claim_id: targetId || undefined,
          reason: reason.trim(),
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        pending_claim_id?: string;
      };
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      setMessage(
        data.pending_claim_id
          ? `Withdrawn from Map. Pending claim ${data.pending_claim_id.slice(0, 8)}… queued for Review.`
          : "Withdrawn from Map; pending claim queued for Review.",
      );
      setReason("");
      setTargetId("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "request failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="xs">
          Rollback
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rollback claim</DialogTitle>
          <DialogDescription>
            Withdraws the approved Map head immediately and creates a new{" "}
            <code className="text-xs">pending_review</code> version for re-review.
            History is preserved.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs">
            <div>
              <span className="text-muted-foreground">Type:</span>{" "}
              {head.claim_type} · {head.subject_ref}
            </div>
            <div>
              <span className="text-muted-foreground">Version:</span> v
              {head.version} · {head.as_of_date}
            </div>
          </div>

          {priors.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rollback-target">Restore payload from</Label>
              <select
                id="rollback-target"
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
              >
                <option value="">Current head (v{head.version})</option>
                {priors.map((p) => (
                  <option key={p.id} value={p.id}>
                    v{p.version} · {p.as_of_date} · {p.review_status}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rollback-reason">Reason (required)</Label>
            <Input
              id="rollback-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this claim being rolled back?"
            />
          </div>

          {error && (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          )}
          {message && (
            <p className="text-xs text-emerald-700 dark:text-emerald-400">
              {message}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Close
          </Button>
          <Button size="sm" onClick={onSubmit} disabled={!canSubmit}>
            {pending ? "Rolling back…" : "Confirm rollback"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
