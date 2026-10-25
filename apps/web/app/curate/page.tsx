import { redirect } from "next/navigation";

/** Curate landing redirects to Overview. */
export default function CurateIndexPage() {
  redirect("/curate/overview");
}
