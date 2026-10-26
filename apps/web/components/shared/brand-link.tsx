import Link from "next/link";
import { withBasePath } from "@/lib/base-path";
import { cn } from "@/lib/utils";

export const BRAND_NAME = "2026 Ebola Outbreak Dashboard";

/** Site mark — matches assets/bdbv-favicon.svg (served from /public). */
export function BrandMark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- small static SVG mark
    <img
      src={withBasePath("/bdbv-favicon.svg")}
      alt=""
      width={28}
      height={28}
      className={cn("size-7 shrink-0 rounded-[7px]", className)}
      aria-hidden
    />
  );
}

/** Top-left brand: icon + product name. */
export function BrandLink({
  href = "/",
  className,
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex min-w-0 items-center gap-2 hover:opacity-90",
        className,
      )}
    >
      <BrandMark />
      <span className="min-w-0 text-sm leading-tight font-semibold tracking-tight">
        {BRAND_NAME}
      </span>
    </Link>
  );
}
