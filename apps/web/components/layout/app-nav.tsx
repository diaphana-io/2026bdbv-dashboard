import Link from "next/link";

const links = [
  { href: "/", label: "Overview" },
  { href: "/timeline", label: "Timeline" },
  { href: "/cases", label: "Cases" },
  { href: "/contacts", label: "Contacts" },
  { href: "/map", label: "Map" },
  { href: "/measures", label: "Measures" },
  { href: "/sources", label: "Sources" },
  { href: "/curate", label: "Curate" },
];

export function AppNav() {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          2026 BDBV
        </Link>
        <nav className="flex flex-wrap gap-2">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-2 py-1 text-sm text-zinc-700 hover:bg-zinc-100"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
