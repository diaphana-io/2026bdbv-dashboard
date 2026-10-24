import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "../../components/ui/table";
import { getSources } from "../../lib/data";

export default function SourcesPage() {
  const rows = getSources();
  return (
    <main className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">Sources</h1>
      <Card>
        <CardHeader className="text-sm font-medium">{rows.length} documents</CardHeader>
        <CardContent className="p-0">
          <Table>
            <THead>
              <TR>
                <TH>Publisher</TH>
                <TH>Kind</TH>
                <TH>Title</TH>
                <TH>Published</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((r) => (
                <TR key={r.id}>
                  <TD>{r.publisher ?? "—"}</TD>
                  <TD>
                    <Badge variant="outline">{r.kind}</Badge>
                  </TD>
                  <TD>
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-700 hover:underline"
                    >
                      {r.title ?? r.url}
                    </a>
                  </TD>
                  <TD className="font-mono text-xs">
                    {(r.published_at ?? "").slice(0, 10) || "—"}
                  </TD>
                  <TD>
                    <Badge variant="secondary">{r.curation_status}</Badge>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
