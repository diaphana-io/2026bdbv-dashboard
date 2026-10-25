import { Badge } from "../../../components/ui/badge";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import {
  InfraStatusTable,
  LlmStatusTable,
  StagesStatusTable,
  type InfraRow,
  type LlmRow,
  type StageRow,
} from "../../../components/curate/status-tables";

type PipelineStatusPayload = {
  spec_version?: number;
  ok?: boolean;
  stages?: StageRow[];
  llm?: LlmRow[];
  infra?: InfraRow[];
  error?: string;
};

async function loadStatus(): Promise<
  { ok: true; data: PipelineStatusPayload } | { ok: false; error: string }
> {
  try {
    // Same-process call — avoids HTTP self-fetch on Workers.
    const { GET } = await import("../../api/curate/pipeline-status/route");
    const res = await GET();
    const data = (await res.json()) as PipelineStatusPayload;
    if (!res.ok) {
      return { ok: false, error: data.error ?? `HTTP ${res.status}` };
    }
    return { ok: true, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : "status_unavailable";
    return { ok: false, error: message };
  }
}

/**
 * Ops Status view. Stage list / health come from surv_engine PIPELINE_SPEC
 * via sys.pipelineStatus — this page only maps arrays.
 */
export default async function CurateStatusPage() {
  const result = await loadStatus();

  if (!result.ok) {
    return (
      <main className="flex flex-col gap-4">
        <div>
          <h1 className="text-lg font-semibold">Status</h1>
          <p className="text-sm text-muted-foreground">
            Pipeline and adapter health from surv_engine.
          </p>
        </div>
        <Card>
          <CardHeader className="text-sm font-semibold">Unavailable</CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {result.error}
          </CardContent>
        </Card>
      </main>
    );
  }

  const { data } = result;
  const stages = Array.isArray(data.stages) ? data.stages : [];
  const llm = Array.isArray(data.llm) ? data.llm : [];
  const infra = Array.isArray(data.infra) ? data.infra : [];

  return (
    <main className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">Status</h1>
          <p className="text-sm text-muted-foreground">
            End-to-end pipeline and LLM stub usage (registry-driven).
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant={data.ok ? "default" : "destructive"}>
            {data.ok ? "ok" : "degraded"}
          </Badge>
          <Badge variant="outline">spec v{data.spec_version ?? "?"}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader className="text-sm font-semibold">Stages</CardHeader>
        <CardContent className="p-0">
          <StagesStatusTable rows={stages} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="text-sm font-semibold">LLM adapters</CardHeader>
        <CardContent className="p-0">
          <LlmStatusTable rows={llm} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="text-sm font-semibold">Infrastructure</CardHeader>
        <CardContent className="p-0">
          <InfraStatusTable rows={infra} />
        </CardContent>
      </Card>
    </main>
  );
}
