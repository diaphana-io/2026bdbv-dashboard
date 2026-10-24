import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function CurateLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-4">
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/">← Map</Link>
        </Button>
      </div>
      {children}
    </div>
  );
}
