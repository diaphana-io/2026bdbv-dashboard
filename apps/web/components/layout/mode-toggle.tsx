"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

const ORDER = ["light", "dark", "system"] as const;

export function ModeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const current = (theme ?? "system") as (typeof ORDER)[number];
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length] ?? "system";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={`Theme: ${current}. Click for ${next}.`}
      onClick={() => setTheme(next)}
    >
      {!mounted || current === "system" ? (
        <Monitor />
      ) : current === "dark" ? (
        <Moon />
      ) : (
        <Sun />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
