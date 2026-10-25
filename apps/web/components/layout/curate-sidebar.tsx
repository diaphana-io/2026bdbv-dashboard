"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangleIcon,
  ExternalLinkIcon,
  FilePenLineIcon,
  InboxIcon,
  LayoutDashboardIcon,
  SparklesIcon,
} from "lucide-react";
import { CurateDataSourceToggle } from "@/components/curate/data-source-toggle";
import { Button } from "@/components/ui/button";
import {
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { CurateDataSource } from "@/lib/curate-data-source";
import { AppSidebar } from "./app-sidebar";

const PIPELINE: {
  href: string;
  label: string;
  step: number;
  icon: typeof InboxIcon;
  exact?: boolean;
}[] = [
  {
    href: "/curate/overview",
    label: "Overview",
    step: 1,
    icon: LayoutDashboardIcon,
    exact: true,
  },
  { href: "/curate/inbox", label: "Inbox", step: 2, icon: InboxIcon },
  { href: "/curate/extract", label: "Extract", step: 3, icon: SparklesIcon },
  { href: "/curate/review", label: "Review", step: 4, icon: FilePenLineIcon },
  {
    href: "/curate/conflicts",
    label: "Conflicts",
    step: 5,
    icon: AlertTriangleIcon,
  },
];

export function CurateSidebar({
  inboxCount,
  conflictCount,
  dataSource,
  neo4jConfigured,
}: {
  inboxCount?: number;
  conflictCount?: number;
  dataSource: CurateDataSource;
  neo4jConfigured: boolean;
}) {
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
      footerTop={
        <CurateDataSourceToggle
          initialSource={dataSource}
          neo4jConfigured={neo4jConfigured}
        />
      }
    >
      <SidebarMenuItem>
        <p className="px-2 pb-1 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
          Curation pipeline
        </p>
      </SidebarMenuItem>
      {PIPELINE.map(({ href, label, step, icon: Icon, exact }) => {
        const active = exact
          ? pathname === href
          : pathname === href || pathname.startsWith(`${href}/`);
        const count =
          href === "/curate/inbox"
            ? inboxCount
            : href === "/curate/conflicts"
              ? conflictCount
              : undefined;

        return (
          <SidebarMenuItem key={href}>
            <SidebarMenuButton asChild isActive={active} tooltip={`${step}. ${label}`}>
              <Link href={href}>
                <Icon />
                <span>
                  <span className="mr-1.5 tabular-nums text-muted-foreground">
                    {step}.
                  </span>
                  {label}
                </span>
              </Link>
            </SidebarMenuButton>
            {typeof count === "number" && count > 0 && (
              <SidebarMenuBadge>{count}</SidebarMenuBadge>
            )}
          </SidebarMenuItem>
        );
      })}
    </AppSidebar>
  );
}
