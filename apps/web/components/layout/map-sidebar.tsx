"use client";

import Link from "next/link";
import {
  ExternalLinkIcon,
  GlobeIcon,
  LayoutDashboardIcon,
  LayersIcon,
  MapIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  SidebarMenuButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import { TRACKED_COUNTRIES } from "@/lib/tracked-countries";
import { AppSidebar, NavSection } from "./app-sidebar";
import { useMapUi, type LayerVisibility } from "../map/map-ui-context";
import { isBasemapSelectable, type BasemapId } from "../map/basemap-style";

const MAP_LAYER_ITEMS: { key: keyof LayerVisibility; label: string }[] = [
  { key: "boundaries", label: "DRC boundaries" },
  { key: "countryNames", label: "Country name" },
  { key: "cities", label: "Cities" },
];

const DATA_LAYER_ITEMS: { key: keyof LayerVisibility; label: string }[] = [
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
    openCountryStats,
    selectedCountryIso,
    layers,
    setLayerVisible,
    basemapId,
    setBasemapId,
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
        {MAP_LAYER_ITEMS.map(({ key, label }) => (
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

      <NavSection icon={<LayersIcon />} label="Data layers" defaultOpen>
        {DATA_LAYER_ITEMS.map(({ key, label }) => (
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
              {(Object.keys(basemapOptions) as BasemapId[]).map((id) => {
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
              })}
            </RadioGroup>
          </div>
        </SidebarMenuSubItem>
      </NavSection>
    </AppSidebar>
  );
}
