import { CountryFilter } from "../../components/overview/country-filter";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "../../components/ui/table";
import { getContacts } from "../../lib/data";
import { ContactsGraph } from "../../components/contacts/contacts-graph";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string }>;
}) {
  const sp = await searchParams;
  const country = sp.country ?? "ALL";
  const rows = getContacts(country === "ALL" ? undefined : country);

  return (
    <main className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">Contacts</h1>
        <CountryFilter active={country} basePath="/contacts" />
      </div>
      <ContactsGraph contacts={rows} />
      <Card>
        <CardHeader className="text-sm font-medium">{rows.length} contacts</CardHeader>
        <CardContent className="p-0">
          <Table>
            <THead>
              <TR>
                <TH>ID</TH>
                <TH>Country</TH>
                <TH>Linked case</TH>
                <TH>Last contact</TH>
                <TH>Setting</TH>
                <TH>Follow-up</TH>
                <TH>Window end</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((r) => (
                <TR key={r.id}>
                  <TD className="font-mono text-xs">{r.visual_id}</TD>
                  <TD>{r.admin0_iso}</TD>
                  <TD className="font-mono text-xs">{r.exposure.to_case_visual_id}</TD>
                  <TD>{r.exposure.date_of_last_contact}</TD>
                  <TD className="text-xs">{r.exposure.exposure_setting}</TD>
                  <TD>
                    <Badge
                      variant={r.followup.status === "active" ? "warning" : "secondary"}
                    >
                      {r.followup.status}
                    </Badge>
                  </TD>
                  <TD className="font-mono text-xs">{r.followup.window_end}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
