import { CoffeeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export const BUY_ME_A_COFFEE_URL =
  "https://www.buymeacoffee.com/mattsakamaki";

/** Compact icon link for header / sidebar footers (between theme and GitHub). */
export function BuyMeACoffeeButton({
  className,
}: {
  className?: string;
}) {
  return (
    <Button variant="ghost" size="icon" className={className} asChild>
      <a
        href={BUY_ME_A_COFFEE_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Buy me a coffee"
        title="Buy me a coffee"
      >
        <CoffeeIcon className="size-4" />
        <span className="sr-only">Buy me a coffee</span>
      </a>
    </Button>
  );
}
