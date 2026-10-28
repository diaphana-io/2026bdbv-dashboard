import { redirect } from "next/navigation";
import { curateHref } from "@/lib/curate-surface";

/** Curate landing redirects to Overview. */
export default function CurateIndexPage() {
  redirect(curateHref("overview"));
}
