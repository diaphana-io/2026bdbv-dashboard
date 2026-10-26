"use client";

import { useMemo } from "react";
import type { MapAggregate } from "@/lib/data-types";
import { TRACKED_COUNTRIES } from "@/lib/tracked-countries";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import provincesData from "../../data/cd_provinces.json";
import territoriesData from "../../data/cd_territories.json";

export type AdminRegionHoverIdentity = {
  admin0_iso: string;
  name: string;
  adm1_pcode?: string;
  adm2_pcode?: string;
  adm3_pcode?: string;
  clientX: number;
  clientY: number;
};

type FeatureCollection = {
  features: Array<{
    properties: Record<string, unknown>;
  }>;
};

const provinces = provincesData as FeatureCollection;
const territories = territoriesData as FeatureCollection;

const ADM1_NAME = new Map<string, string>();
for (const f of provinces.features) {
  const code = f.properties["adm1_pcode"];
  const name = f.properties["name"];
  if (typeof code === "string" && typeof name === "string") {
    ADM1_NAME.set(code, name);
  }
}

const ADM2_NAME = new Map<string, string>();
for (const f of territories.features) {
  const code = f.properties["adm2_pcode"];
  const name = f.properties["name"];
  if (typeof code === "string" && typeof name === "string") {
    ADM2_NAME.set(code, name);
  }
}

function lookupAggregate(
  aggregates: MapAggregate[],
  identity: AdminRegionHoverIdentity,
): MapAggregate | undefined {
  const keys = [
    identity.adm3_pcode,
    identity.adm2_pcode,
    identity.adm1_pcode,
    identity.admin0_iso,
  ].filter((k): k is string => typeof k === "string" && k.length > 0);

  for (const key of keys) {
    const found = aggregates.find((a) => a.admin_iso === key);
    if (found) return found;
  }
  return undefined;
}

function resolveHierarchy(identity: AdminRegionHoverIdentity) {
  const country =
    TRACKED_COUNTRIES.find((c) => c.iso === identity.admin0_iso)?.name ??
    identity.admin0_iso;

  let admin1: string | undefined;
  let admin2: string | undefined;
  let admin3: string | undefined;

  if (identity.adm3_pcode) {
    admin3 = identity.name;
    admin2 = identity.adm2_pcode
      ? ADM2_NAME.get(identity.adm2_pcode)
      : undefined;
    admin1 = identity.adm1_pcode
      ? ADM1_NAME.get(identity.adm1_pcode)
      : undefined;
  } else if (identity.adm2_pcode) {
    admin2 = identity.name;
    admin1 = identity.adm1_pcode
      ? ADM1_NAME.get(identity.adm1_pcode)
      : undefined;
  } else {
    admin1 = identity.name;
  }

  return { country, admin1, admin2, admin3 };
}

function StatLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs tabular-nums">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

type Props = {
  identity: AdminRegionHoverIdentity | null;
  aggregates: MapAggregate[];
};

/**
 * Map-driven hover card: identity from featureHover; counts from snapshot aggregates.
 */
export function AdminRegionHoverCard({ identity, aggregates }: Props) {
  const resolved = useMemo(() => {
    if (!identity) return null;
    const hierarchy = resolveHierarchy(identity);
    const agg = lookupAggregate(aggregates, identity);
    return {
      ...hierarchy,
      confirmed: agg?.confirmed ?? 0,
      suspected: 0,
      recovered: 0,
      deceased: agg?.deaths ?? 0,
      clientX: identity.clientX,
      clientY: identity.clientY,
    };
  }, [identity, aggregates]);

  if (!resolved) return null;

  return (
    <HoverCard open>
      <HoverCardTrigger asChild>
        <span
          aria-hidden
          className="pointer-events-none fixed z-50 size-px"
          style={{ left: resolved.clientX, top: resolved.clientY }}
        />
      </HoverCardTrigger>
      <HoverCardContent
        side="top"
        align="start"
        sideOffset={12}
        className="pointer-events-none w-56 space-y-2"
      >
        <p className="text-sm font-medium leading-tight">{resolved.country}</p>
        <dl className="space-y-0.5 text-xs">
          {resolved.admin1 ? (
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Admin1</dt>
              <dd className="text-right font-medium">{resolved.admin1}</dd>
            </div>
          ) : null}
          {resolved.admin2 ? (
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Admin2</dt>
              <dd className="text-right font-medium">{resolved.admin2}</dd>
            </div>
          ) : null}
          {resolved.admin3 ? (
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Admin3</dt>
              <dd className="text-right font-medium">{resolved.admin3}</dd>
            </div>
          ) : null}
        </dl>
        <div className="space-y-1 border-t border-border pt-2">
          <StatLine label="Confirmed" value={resolved.confirmed} />
          <StatLine label="Suspected" value={resolved.suspected} />
          <StatLine label="Recovered" value={resolved.recovered} />
          <StatLine label="Deceased" value={resolved.deceased} />
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
