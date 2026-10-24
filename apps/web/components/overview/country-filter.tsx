import Link from "next/link";

const countries = [
  { code: "ALL", label: "All" },
  { code: "NG", label: "NG" },
  { code: "KE", label: "KE" },
  { code: "UG", label: "UG" },
];

export function CountryFilter({
  active,
  basePath,
}: {
  active: string;
  basePath: string;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {countries.map((c) => {
        const href = c.code === "ALL" ? basePath : `${basePath}?country=${c.code}`;
        const isActive = active === c.code;
        return (
          <Link
            key={c.code}
            href={href}
            className={`rounded-md px-2 py-1 text-xs font-medium ${
              isActive
                ? "bg-zinc-900 text-white"
                : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            {c.label}
          </Link>
        );
      })}
    </div>
  );
}
