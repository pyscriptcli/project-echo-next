import type { DemandRecord } from "@/types/demands";

export const DEMANDS_CLICKUP_LIST_ID = "901420989525";

export function formatDemandClickUpTitle(demand: DemandRecord): string {
  const min = Number(demand.minSqm).toLocaleString();
  const max = Number(demand.maxSqm).toLocaleString();
  const size = demand.minSqm === demand.maxSqm ? `${max} sqm` : `${min}-${max} sqm`;
  const count = demand.locations?.length ?? 1;
  const locations = `${demand.city}${count > 1 ? ` +${count - 1} locations` : `, ${demand.location}`}`;
  return `[${demand.type}] ${demand.client} — ${size} | ${locations} (${demand.assoc})`;
}

export function formatDemandClickUpDescription(demand: DemandRecord): string {
  const min = Number(demand.minSqm).toLocaleString();
  const max = Number(demand.maxSqm).toLocaleString();
  const size = demand.minSqm === demand.maxSqm ? `${max} sqm` : `${min} – ${max} sqm`;

  return `## Demand Brief

| Parameter | Specification |
|:---|:---|
| Client | ${demand.client} |
| Industry | ${demand.industry} |
| Property type | ${demand.type} |
| Area requirement | ${size} |
| Target locations | ${(demand.locations?.length ? demand.locations : [{ gloc: demand.gloc, city: demand.city, area: demand.location }]).map((location, index) => `${index + 1}. ${location.city} (${location.gloc}) — ${location.area}`).join("; ")} |
| Priority | ${demand.priority} |
| Purpose | ${demand.purpose || "—"} |
| Timeline | ${demand.timeline || "—"} |
| Associate | ${demand.assoc} |
| Source | ${demand.source || "—"} |
| Inquiry date | ${demand.date || "—"} |
| Status | ${demand.status || "—"} |
| Action taken | ${demand.actionTaken || "—"} |

${demand.remarks || ""}`;
}
