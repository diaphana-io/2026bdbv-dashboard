"use client";

import { useState, type ReactNode } from "react";
import { BookOpenIcon, ChevronDownIcon } from "lucide-react";
import { Collapsible } from "radix-ui";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarRail,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { BrandLink } from "./brand-link";
import { ModeToggle } from "./mode-toggle";

const GITHUB_REPO = "https://github.com/diaphana-io/2026bdbv-dashboard";
const DOCS_URL = "https://2026bdbv.diaphana.io/docs";

/** Lucide dropped brand icons; keep a minimal GitHub mark inline. */
export function GithubIcon({ className }: { className?: string }) {
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

/** Collapsible nav group used inside AppSidebar menus. */
export function NavSection({
  icon,
  label,
  defaultOpen = true,
  children,
}: {
  icon: ReactNode;
  label: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible.Root open={open} onOpenChange={setOpen} className="group/nav">
      <SidebarMenuItem>
        <Collapsible.Trigger asChild>
          <SidebarMenuButton className="data-[state=open]:bg-sidebar-accent">
            {icon}
            <span>{label}</span>
            <ChevronDownIcon
              className={cn(
                "ml-auto size-4 opacity-60 transition-transform",
                open && "rotate-180",
              )}
            />
          </SidebarMenuButton>
        </Collapsible.Trigger>
        <Collapsible.Content>
          <SidebarMenuSub className="mr-0 pr-0">{children}</SidebarMenuSub>
        </Collapsible.Content>
      </SidebarMenuItem>
    </Collapsible.Root>
  );
}

/**
 * Shared sidebar chrome (brand header, footer theme/links, rail).
 * Pass page-specific nav as children (SidebarMenuItem trees).
 */
export function AppSidebar({
  headerAction,
  children,
}: {
  headerAction?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Sidebar collapsible="offcanvas" variant="sidebar">
      <SidebarHeader className="gap-2 border-b border-sidebar-border px-3 py-3">
        <div className="flex items-start justify-between gap-2">
          <BrandLink className="flex-1" />
          {headerAction}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="py-2">
          <SidebarGroupContent>
            <SidebarMenu>{children}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
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
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
