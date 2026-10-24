import dynamic from "next/dynamic";
import { getMapSnapshot } from "../lib/data";

const OutbreakMap = dynamic(
  () =>
    import("../components/map/outbreak-map").then((m) => m.OutbreakMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[calc(100vh-3.25rem)] items-center justify-center bg-[#e8eef2] text-sm text-zinc-600">
        Loading map…
      </div>
    ),
  },
);

const MIN_DATE = "2026-05-01";
const MAX_DATE = "2026-10-23";

export default async function Home() {
  const initialSnapshot = await getMapSnapshot(MAX_DATE);
  return (
    <OutbreakMap
      initialSnapshot={initialSnapshot}
      minDate={MIN_DATE}
      maxDate={MAX_DATE}
    />
  );
}
