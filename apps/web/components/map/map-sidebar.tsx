"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  BookOpenIcon,
  ChevronDownIcon,
  ExternalLinkIcon,
  GlobeIcon,
  LayoutDashboardIcon,
  LayersIcon,
  MapIcon,
} from "lucide-react";
import { Collapsible } from "radix-ui";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import { TRACKED_COUNTRIES } from "@/lib/tracked-countries";
import { cn } from "@/lib/utils";
import { BrandLink } from "../shared/brand-link";
import { ModeToggle } from "../shared/mode-toggle";
import {
  useMapUi,
  type BoundaryLevel,
  type LayerVisibility,
} from "./map-ui-context";
import { isBasemapSelectable, type BasemapId } from "./basemap-style";

const GITHUB_REPO = "https://github.com/diaphana-io/2026bdbv-dashboard";
const DOCS_URL = "https://2026bdbv.diaphana.io/docs";
const NEO4J_URL = "https://neo4j.com/";
const NAVARA_URL = "https://navara.world/";

const MAP_LAYER_ITEMS: { key: keyof LayerVisibility; label: string }[] = [
  { key: "countryNames", label: "Country / city label" },
  { key: "cities", label: "Cities" },
];

const BOUNDARY_LEVEL_OPTIONS: { value: BoundaryLevel; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "admin1", label: "Admin1 (Provinces)" },
  { value: "admin2", label: "Admin2 (Territories)" },
  { value: "admin3", label: "Admin3 (Health zones)" },
];

const DATA_LAYER_ITEMS: { key: keyof LayerVisibility; label: string }[] = [
  { key: "cases", label: "Cases" },
  { key: "claims", label: "Claims" },
  { key: "exposures", label: "Exposures" },
  { key: "travels", label: "Travel" },
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

function NavSection({
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
    <div className="flex w-full items-center justify-between gap-3 px-2 py-1">
      <Label htmlFor={id} className="cursor-pointer text-sm font-normal">
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
    openCountryStats,
    selectedCountryIso,
    layers,
    setLayerVisible,
    boundaryLevel,
    setBoundaryLevel,
    basemapId,
    setBasemapId,
    basemapOptions,
  } = useMapUi();

  return (
    <Sidebar collapsible="offcanvas" variant="floating">
      <SidebarHeader className="gap-2 border-b border-sidebar-border px-3 py-3">
        <div className="flex items-start justify-between gap-2">
          <BrandLink className="flex-1" />
          <Button variant="outline" size="xs" asChild>
            <Link href="/curate" target="_blank" rel="noopener noreferrer">
              Curate
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
                icon={<LayoutDashboardIcon />}
                label="Data panels"
                defaultOpen
              >
                <SidebarMenuSubItem>
                  <ToggleRow
                    id="panel-country-stats"
                    label="Country statistics"
                    checked={openPanels["country-stats"]}
                    onCheckedChange={(checked) => {
                      if (checked) openCountryStats();
                      else setPanelOpen("country-stats", false);
                    }}
                  />
                </SidebarMenuSubItem>
                {TRACKED_COUNTRIES.map((country) => (
                  <SidebarMenuSubItem key={country.iso}>
                    <SidebarMenuButton
                      size="sm"
                      isActive={
                        openPanels["country-stats"] &&
                        selectedCountryIso === country.iso
                      }
                      onClick={() => openCountryStats(country.iso)}
                    >
                      <span
                        className="size-2 shrink-0 rounded-full ring-1 ring-black/10"
                        style={{ backgroundColor: country.color }}
                        aria-hidden
                      />
                      <span>{country.shortName}</span>
                    </SidebarMenuButton>
                  </SidebarMenuSubItem>
                ))}
                <SidebarMenuSubItem>
                  <ToggleRow
                    id="panel-case-detail"
                    label="Case detail"
                    checked={openPanels["case-detail"]}
                    onCheckedChange={(checked) =>
                      setPanelOpen("case-detail", checked)
                    }
                  />
                </SidebarMenuSubItem>
              </NavSection>

              <NavSection icon={<GlobeIcon />} label="Map layers" defaultOpen>
                <SidebarMenuSubItem>
                  <ToggleRow
                    id="layer-boundaries"
                    label="DRC boundaries"
                    checked={layers.boundaries}
                    onCheckedChange={(checked) =>
                      setLayerVisible("boundaries", checked)
                    }
                  />
                </SidebarMenuSubItem>
                {layers.boundaries ? (
                  <SidebarMenuSubItem>
                    <div className="space-y-2 px-2 pb-1.5 pt-0.5">
                      <RadioGroup
                        value={boundaryLevel}
                        onValueChange={(value) =>
                          setBoundaryLevel(value as BoundaryLevel)
                        }
                        className="gap-2"
                      >
                        {BOUNDARY_LEVEL_OPTIONS.map(({ value, label }) => (
                          <div key={value} className="flex items-center gap-2">
                            <RadioGroupItem
                              value={value}
                              id={`boundary-level-${value}`}
                            />
                            <Label
                              htmlFor={`boundary-level-${value}`}
                              className="text-sm font-normal"
                            >
                              {label}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  </SidebarMenuSubItem>
                ) : null}
                {MAP_LAYER_ITEMS.map(({ key, label }) => (
                  <SidebarMenuSubItem key={key}>
                    <ToggleRow
                      id={`layer-${key}`}
                      label={label}
                      checked={layers[key]}
                      onCheckedChange={(checked) =>
                        setLayerVisible(key, checked)
                      }
                    />
                  </SidebarMenuSubItem>
                ))}
              </NavSection>

              <NavSection icon={<LayersIcon />} label="Data layers" defaultOpen>
                {DATA_LAYER_ITEMS.map(({ key, label }) => (
                  <SidebarMenuSubItem key={key}>
                    <ToggleRow
                      id={`layer-${key}`}
                      label={label}
                      checked={layers[key]}
                      onCheckedChange={(checked) =>
                        setLayerVisible(key, checked)
                      }
                    />
                  </SidebarMenuSubItem>
                ))}
              </NavSection>

              <NavSection icon={<MapIcon />} label="Basemap" defaultOpen>
                <SidebarMenuSubItem>
                  <div className="space-y-3 px-2 py-1.5">
                    <RadioGroup
                      value={basemapId}
                      onValueChange={(value) =>
                        setBasemapId(value as BasemapId)
                      }
                      className="gap-2"
                    >
                      {(Object.keys(basemapOptions) as BasemapId[]).map(
                        (id) => {
                          const selectable = isBasemapSelectable(id);
                          return (
                            <div key={id} className="flex items-center gap-2">
                              <RadioGroupItem
                                value={id}
                                id={`basemap-${id}`}
                                disabled={!selectable}
                              />
                              <Label
                                htmlFor={`basemap-${id}`}
                                className={
                                  selectable
                                    ? "text-sm font-normal"
                                    : "text-sm font-normal text-muted-foreground"
                                }
                              >
                                {basemapOptions[id].label}
                                {!selectable ? " (unavailable)" : null}
                              </Label>
                            </div>
                          );
                        },
                      )}
                    </RadioGroup>
                  </div>
                </SidebarMenuSubItem>
              </NavSection>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-2 border-t border-sidebar-border">
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
