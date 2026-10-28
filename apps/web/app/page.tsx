import { redirect } from "next/navigation";
import { MapShell } from "../components/map/map-shell";
import { OutbreakMap } from "../components/map/outbreak-map";
import { curateHref, isCurateSurface } from "../lib/curate-surface";
import { getMapSnapshot } from "../lib/data";

const MIN_DATE = "2026-05-01";
const MAX_DATE = "2026-10-23";

/**
 * Map home at `/` (public `/app` or `/curate` after basePath).
 * On the Curate Worker, `/curate` must not render Map — send to Overview.
 * (next rewrites do not override `app/page.tsx` for `/`.)
 */
export default async function Home() {
  if (isCurateSurface()) {
    redirect(curateHref("overview"));
  }

  const initialSnapshot = await getMapSnapshot(MAX_DATE);
  return (
    <MapShell>
      <OutbreakMap
        initialSnapshot={initialSnapshot}
        minDate={MIN_DATE}
        maxDate={MAX_DATE}
      />
    </MapShell>
  );
}
