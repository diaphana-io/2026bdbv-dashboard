"use client";

import Link from "next/link";
import {
  ExternalLinkIcon,
  LayoutDashboardIcon,
  LayersIcon,
  MapIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { SidebarMenuSubItem } from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import { TRACKED_COUNTRIES } from "@/lib/tracked-countries";
import { AppSidebar, NavSection } from "./app-sidebar";
import { useMapUi, type LayerVisibility } from "../map/map-ui-context";
import type { BasemapId } from "../map/basemap-style";

const LAYER_ITEMS: { key: keyof LayerVisibility; label: string }[] = [
  { key: "boundaries", label: "Country boundary" },
  { key: "cases", label: "Cases" },
  { key: "exposures", label: "Exposures" },
  { key: "travels", label: "Travel" },
];

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
    layers,
    setLayerVisible,
    countryStatsVisible,
    setCountryStatsVisible,
    basemapId,
    setBasemapId,
    syncBasemapToUiTheme,
    setSyncBasemapToUiTheme,
    basemapOptions,
  } = useMapUi();

  return (
    <AppSidebar
      headerAction={
        <Button variant="outline" size="xs" asChild>
          <Link href="/curate" target="_blank" rel="noopener noreferrer">
            Curate
            <ExternalLinkIcon data-icon="inline-end" />
          </Link>
        </Button>
      }
    >
      <NavSection icon={<LayoutDashboardIcon />} label="Data panels" defaultOpen>
        <SidebarMenuSubItem>
          <div className="px-2 pt-1 pb-0.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
            Country statistics
          </div>
        </SidebarMenuSubItem>
        {TRACKED_COUNTRIES.map((country) => (
          <SidebarMenuSubItem key={country.iso}>
            <ToggleRow
              id={`country-stats-${country.iso}`}
              label={country.shortName}
              checked={countryStatsVisible[country.iso]}
              onCheckedChange={(checked) =>
                setCountryStatsVisible(country.iso, checked)
              }
            />
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

      <NavSection icon={<LayersIcon />} label="Layers" defaultOpen>
        {LAYER_ITEMS.map(({ key, label }) => (
          <SidebarMenuSubItem key={key}>
            <ToggleRow
              id={`layer-${key}`}
              label={label}
              checked={layers[key]}
              onCheckedChange={(checked) => setLayerVisible(key, checked)}
            />
          </SidebarMenuSubItem>
        ))}
      </NavSection>

      <NavSection icon={<MapIcon />} label="Basemap" defaultOpen>
        <SidebarMenuSubItem>
          <div className="space-y-3 px-2 py-1.5">
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
          </div>
        </SidebarMenuSubItem>
      </NavSection>
    </AppSidebar>
  );
}
