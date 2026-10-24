"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ExternalLinkIcon,
  InboxIcon,
  FilePenLineIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";

const NAV_ITEMS: {
  href: string;
  label: string;
  icon: typeof InboxIcon;
  exact?: boolean;
}[] = [
  { href: "/curate", label: "Inbox", icon: InboxIcon, exact: true },
  { href: "/curate/review", label: "Review", icon: FilePenLineIcon },
];

export function CurateSidebar() {
  const pathname = usePathname();

  return (
    <AppSidebar
      headerAction={
        <Button variant="outline" size="xs" asChild>
          <Link href="/" target="_blank" rel="noopener noreferrer">
            Map
            <ExternalLinkIcon data-icon="inline-end" />
          </Link>
        </Button>
      }
    >
      {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
        const active = exact
          ? pathname === href
          : pathname === href || pathname.startsWith(`${href}/`);

        return (
          <SidebarMenuItem key={href}>
            <SidebarMenuButton asChild isActive={active} tooltip={label}>
              <Link href={href}>
                <Icon />
                <span>{label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </AppSidebar>
  );
}
