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
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import type { CurateDataSource } from "@/lib/curate-data-source";
import { BrandLink } from "../shared/brand-link";
import { ModeToggle } from "../shared/mode-toggle";

const GITHUB_REPO = "https://github.com/diaphana-io/2026bdbv-dashboard";
const DOCS_URL = "https://2026bdbv.diaphana.io/docs";
const NEO4J_URL = "https://neo4j.com/";
const NAVARA_URL = "https://navara.world/";

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

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path d="M12 2C6.477 2 2 6.586 2 12.253c0 4.537 2.865 8.369 6.839 9.726.5.094.682-.222.682-.482 0-.237-.009-.866-.014-1.7-2.782.62-3.369-1.38-3.369-1.38-.455-1.181-1.11-1.496-1.11-1.496-.908-.635.069-.622.069-.622 1.003.072 1.53 1.06 1.53 1.06.891 1.566 2.339 1.114 2.91.852.091-.663.35-1.114.636-1.37-2.22-.259-4.555-1.143-4.555-5.086 0-1.124.39-2.043 1.029-2.764-.103-.26-.446-1.302.098-2.714 0 0 .84-.276 2.75 1.055A9.3 9.3 0 0 1 12 6.84c.85.004 1.705.118 2.504.346 1.909-1.331 2.747-1.055 2.747-1.055.546 1.412.203 2.454.1 2.714.64.721 1.028 1.64 1.028 2.764 0 3.952-2.339 4.824-4.566 5.078.359.317.679.943.679 1.902 0 1.371-.012 2.477-.012 2.813 0 .263.18.58.688.481A10.27 10.27 0 0 0 22 12.253C22 6.586 17.523 2 12 2Z" />
    </svg>
  );
}

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
    <Sidebar collapsible="offcanvas" variant="sidebar">
      <SidebarHeader className="gap-2 border-b border-sidebar-border px-3 py-3">
        <div className="flex items-start justify-between gap-2">
          <BrandLink className="flex-1" />
          <Button variant="outline" size="xs" asChild>
            <Link href="/" target="_blank" rel="noopener noreferrer">
              Map
              <ExternalLinkIcon data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="py-2">
          <SidebarGroupContent>
            <SidebarMenu>
              <NavSection
                title="Claim"
                items={CLAIM_NAV}
                pathname={pathname}
                inboxCount={inboxCount}
                conflictCount={conflictCount}
              />
              <NavSection title="Case" items={CASE_NAV} pathname={pathname} />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-2 border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <CurateDataSourceToggle
              initialSource={dataSource}
              neo4jConfigured={neo4jConfigured}
            />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <div className="flex w-full items-center justify-between gap-1 px-1">
              <ModeToggle />
              <div className="flex items-center gap-1">
                <SidebarMenuButton asChild tooltip="GitHub repository">
                  <a
                    href={GITHUB_REPO}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="GitHub repository"
                  >
                    <GithubIcon className="size-4" />
                  </a>
                </SidebarMenuButton>
                <SidebarMenuButton asChild tooltip="Documentation">
                  <a
                    href={DOCS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Documentation"
                  >
                    <BookOpenIcon className="size-4" />
                  </a>
                </SidebarMenuButton>
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="px-2 pb-1">
          <p className="mb-2 text-[10px] leading-tight text-muted-foreground">
            This dashboard is powered by:
          </p>
          <div className="flex items-center gap-4">
            <a
              href={NEO4J_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-70 transition-opacity hover:opacity-100"
              aria-label="Neo4j"
            >
              <img
                src="/logos/neo4j.svg"
                alt="Neo4j"
                className="h-4 w-auto dark:hidden"
              />
              <img
                src="/logos/neo4j-white.svg"
                alt=""
                aria-hidden
                className="hidden h-4 w-auto dark:block"
              />
            </a>
            <a
              href={NAVARA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-70 transition-opacity hover:opacity-100"
              aria-label="Navara"
            >
              <img
                src="/logos/navara.svg"
                alt="Navara"
                className="h-4 w-auto dark:hidden"
              />
              <img
                src="/logos/navara-white.svg"
                alt=""
                aria-hidden
                className="hidden h-4 w-auto dark:block"
              />
            </a>
          </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
