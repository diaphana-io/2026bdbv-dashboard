import { MapShell } from "../components/map/map-shell";
import { OutbreakMap } from "../components/map/outbreak-map";
import { getMapSnapshot } from "../lib/data";

const MIN_DATE = "2026-05-01";
const MAX_DATE = "2026-10-23";

/** Map home at `/` (public `/app` after basePath). */
export default async function Home() {
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
