"use client";

import Link from "next/link";
import { ExternalLinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import { ModeToggle } from "./mode-toggle";
import { useMapUi, type LayerVisibility } from "../map/map-ui-context";
import type { BasemapId } from "../map/basemap-style";
import { PANEL_REGISTRY } from "../panels/registry";
import type { PanelId } from "../panels/types";

const GITHUB_REPO = "https://github.com/diaphana-io/2026bdbv-dashboard";

const LAYER_LABELS: Record<keyof LayerVisibility, string> = {
  cases: "Cases",
  exposures: "Exposures",
  travels: "Travel",
};

/** Lucide dropped brand icons; keep a minimal GitHub mark inline. */
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

function ToggleRow({
  id,
  label,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-2 py-1.5">
      <Label htmlFor={id} className="text-sm font-normal">
        {label}
      </Label>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        size="sm"
      />
    </div>
  );
}

export function MapSidebar() {
  const {
    openPanels,
    setPanelOpen,
    layers,
    setLayerVisible,
    basemapId,
    setBasemapId,
    syncBasemapToUiTheme,
    setSyncBasemapToUiTheme,
    basemapOptions,
  } = useMapUi();

  return (
    <Sidebar collapsible="offcanvas" variant="sidebar">
      <SidebarHeader className="gap-2 border-b border-sidebar-border px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            2026 BDBV
          </Link>
          <Button variant="outline" size="xs" asChild>
            <Link href="/curate" target="_blank" rel="noopener noreferrer">
              Curate
              <ExternalLinkIcon data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Data panels</SidebarGroupLabel>
          <SidebarGroupContent>
            {PANEL_REGISTRY.map((def) => (
              <ToggleRow
                key={def.id}
                id={`panel-${def.id}`}
                label={def.title}
                checked={openPanels[def.id as PanelId]}
                onCheckedChange={(checked) =>
                  setPanelOpen(def.id as PanelId, checked)
                }
              />
            ))}
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Layers</SidebarGroupLabel>
          <SidebarGroupContent>
            {(Object.keys(LAYER_LABELS) as (keyof LayerVisibility)[]).map(
              (key) => (
                <ToggleRow
                  key={key}
                  id={`layer-${key}`}
                  label={LAYER_LABELS[key]}
                  checked={layers[key]}
                  onCheckedChange={(checked) => setLayerVisible(key, checked)}
                />
              ),
            )}
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Basemap</SidebarGroupLabel>
          <SidebarGroupContent className="space-y-3 px-2">
            <RadioGroup
              value={basemapId}
              onValueChange={(value) => setBasemapId(value as BasemapId)}
              className="gap-2"
            >
              {(Object.keys(basemapOptions) as BasemapId[]).map((id) => (
                <div key={id} className="flex items-center gap-2">
                  <RadioGroupItem value={id} id={`basemap-${id}`} />
                  <Label
                    htmlFor={`basemap-${id}`}
                    className="text-sm font-normal"
                  >
                    {basemapOptions[id].label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            <Separator />
            <ToggleRow
              id="sync-basemap"
              label="Disable automatic map theme change"
              checked={!syncBasemapToUiTheme}
              onCheckedChange={(disabled) =>
                setSyncBasemapToUiTheme(!disabled)
              }
            />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex w-full items-center justify-between gap-1 px-1">
              <ModeToggle />
              <SidebarMenuButton asChild tooltip="GitHub repository">
                <a
                  href={GITHUB_REPO}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub repository"
                >
                  <GithubIcon className="size-4" />
                  <span>GitHub</span>
                </a>
              </SidebarMenuButton>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
