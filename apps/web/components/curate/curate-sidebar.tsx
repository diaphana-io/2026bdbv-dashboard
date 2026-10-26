"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ActivityIcon,
  AlertTriangleIcon,
  BookOpenIcon,
  ExternalLinkIcon,
  FilePenLineIcon,
  FolderKanbanIcon,
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
import { AppSidebar } from "../layout/app-sidebar";

type NavItem = {
  href: string;
  label: string;
  icon: typeof InboxIcon;
  exact?: boolean;
};

const CLAIM_NAV: NavItem[] = [
  {
    href: "/curate/overview",
    label: "Overview",
    icon: LayoutDashboardIcon,
    exact: true,
  },
  { href: "/curate/inbox", label: "Inbox", icon: InboxIcon },
  { href: "/curate/catalog", label: "Catalog", icon: BookOpenIcon },
  { href: "/curate/extract", label: "Extract", icon: SparklesIcon },
  { href: "/curate/review", label: "Review", icon: FilePenLineIcon },
  {
    href: "/curate/conflicts",
    label: "Conflicts",
    icon: AlertTriangleIcon,
  },
  {
    href: "/curate/status",
    label: "Status",
    icon: ActivityIcon,
  },
];

const CASE_NAV: NavItem[] = [
  {
    href: "/curate/cases",
    label: "Cases",
    icon: FolderKanbanIcon,
    exact: true,
  },
  {
    href: "/curate/cases/extract",
    label: "Extract",
    icon: SparklesIcon,
  },
  {
    href: "/curate/cases/review",
    label: "Review",
    icon: FilePenLineIcon,
  },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavSection({
  title,
  items,
  pathname,
  inboxCount,
  conflictCount,
}: {
  title: string;
  items: NavItem[];
  pathname: string;
  inboxCount?: number;
  conflictCount?: number;
}) {
  return (
    <>
      <SidebarMenuItem>
        <p className="px-2 pb-1 pt-2 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
          {title}
        </p>
      </SidebarMenuItem>
      {items.map(({ href, label, icon: Icon, exact }) => {
        const active = isActive(pathname, href, exact);
        const count =
          href === "/curate/inbox"
            ? inboxCount
            : href === "/curate/conflicts"
              ? conflictCount
              : undefined;

        return (
          <SidebarMenuItem key={href}>
            <SidebarMenuButton asChild isActive={active} tooltip={label}>
              <Link href={href}>
                <Icon />
                <span>{label}</span>
              </Link>
            </SidebarMenuButton>
            {typeof count === "number" && count > 0 && (
              <SidebarMenuBadge>{count}</SidebarMenuBadge>
            )}
          </SidebarMenuItem>
        );
      })}
    </>
  );
}

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
      <NavSection
        title="Claim"
        items={CLAIM_NAV}
        pathname={pathname}
        inboxCount={inboxCount}
        conflictCount={conflictCount}
      />
      <NavSection title="Case" items={CASE_NAV} pathname={pathname} />
    </AppSidebar>
  );
}
