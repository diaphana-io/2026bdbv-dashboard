"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { withBasePath } from "../../lib/base-path";
import {
  CLAIM_CATEGORIES,
  claimCategoryForType,
  type ClaimCategory,
} from "../../lib/claim-category";

export function ClaimReviewForm({ sourceUrl }: { sourceUrl: string }) {
  const [claimType, setClaimType] = useState("case_count");
  const [claimCategory, setClaimCategory] = useState<ClaimCategory>(
    claimCategoryForType("case_count"),
  );
  const [subjectRef, setSubjectRef] = useState("KE");
  const [asOfDate, setAsOfDate] = useState("2026-10-20");
  const [objectValue, setObjectValue] = useState('{"confirmed":9,"deaths":1}');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function onClaimTypeChange(next: string) {
    setClaimType(next);
    setClaimCategory(claimCategoryForType(next));
  }

  async function submit(action: "approve" | "reject") {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(withBasePath("/api/curate/review-claim"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action,
          claim_type: claimType,
          claim_category: claimCategory,
          subject_ref: subjectRef,
          as_of_date: asOfDate,
          object_value: objectValue,
          source_url: sourceUrl || null,
          rejection_reason: action === "reject" ? "human_reject" : undefined,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        review_status?: string;
        open_conflict?: boolean;
      };
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      setMessage(
        data.open_conflict
          ? `${data.review_status}: kept visible with open conflict`
          : `${data.review_status} (not persisted yet)`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "request failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium text-zinc-600">claim_type</label>
      <input
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
        value={claimType}
        onChange={(e) => onClaimTypeChange(e.target.value)}
      />
      <label className="text-xs font-medium text-zinc-600">claim_category</label>
      <select
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
        value={claimCategory}
        onChange={(e) => setClaimCategory(e.target.value as ClaimCategory)}
      >
        {CLAIM_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <label className="text-xs font-medium text-zinc-600">subject_ref</label>
      <input
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
        value={subjectRef}
        onChange={(e) => setSubjectRef(e.target.value)}
      />
      <label className="text-xs font-medium text-zinc-600">as_of_date</label>
      <input
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
        value={asOfDate}
        onChange={(e) => setAsOfDate(e.target.value)}
      />
      <label className="text-xs font-medium text-zinc-600">object_value (JSON)</label>
      <textarea
        className="min-h-24 rounded-md border border-zinc-300 px-3 py-1.5 font-mono text-xs"
        value={objectValue}
        onChange={(e) => setObjectValue(e.target.value)}
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <Button type="button" disabled={pending} onClick={() => void submit("approve")}>
          Approve
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={pending}
          onClick={() => void submit("reject")}
        >
          Reject
        </Button>
      </div>
      {message && <div className="text-xs text-zinc-600">{message}</div>}
      {error && <div className="text-xs text-red-700">{error}</div>}
    </div>
  );
}
