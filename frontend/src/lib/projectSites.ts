import projectSitesData from "@/lib/projectSitesData.json";

export type ProjectSite = {
  tradeArea: string;
  siteNo: string;
  siteName: string;
  priority: string;
};

export const projectSites = projectSitesData as ProjectSite[];

export const projectSiteFields = [
  { key: "siteNo", name: "Site No" },
  { key: "siteName", name: "Site Name" },
  { key: "priority", name: "P/S" },
  { key: "lessor", name: "Lessor" },
  { key: "status", name: "Status" },
  { key: "monthlyRate", name: "Monthly Rate" },
  { key: "pfStructure", name: "PF Structure" },
  { key: "amount", name: "Amount" },
] as const;

export function sitesForSubproject(listName: string) {
  const normalizedName = listName.toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return projectSites.filter((site) => {
    const rawArea = site.tradeArea.replace(/^\(Focal Point [AB]\)\s*/i, "");
    const area = rawArea.toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (area.includes("commonwealth") && normalizedName.includes("commonwealth")) {
      const focalPoint = site.tradeArea.match(/^\(Focal Point ([AB])\)/i)?.[1]?.toLocaleLowerCase();
      const combinedFocalPoints = normalizedName.includes("focal point a b");
      if (combinedFocalPoints) return true;
      if (normalizedName.includes("focal point a")) return focalPoint === "a";
      if (normalizedName.includes("focal point b")) return focalPoint === "b";
      return true;
    }
    if (area.includes("north harbour")) return normalizedName.includes("north harbour");
    if (area.includes("katipunan")) return normalizedName.includes("katipunan");
    if (area.includes("buendia")) return normalizedName.includes("buendia");
    if (area.includes("mandaluyong")) return normalizedName.includes("guevarra") || normalizedName.includes("guevara");
    const focalPoint = site.tradeArea.match(/^\(Focal Point ([AB])\)/i)?.[1]?.toLocaleLowerCase();
    if (!normalizedName.includes(area) && !(area.includes("mandaluyong") && normalizedName.includes("guevarra"))) return false;
    if (normalizedName.includes("focal point a")) return focalPoint === "a";
    if (normalizedName.includes("focal point b")) return focalPoint === "b";
    return true;
  });
}

export function siteRecordMarker(site: ProjectSite) {
  const area = site.tradeArea.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `<!-- MOSAIC_SITE_RECORD:${area}:${site.siteNo} -->`;
}

export function siteRecordDescription(site: ProjectSite) {
  return [
    siteRecordMarker(site),
    `Trade Area: ${site.tradeArea}`,
    `Site No: ${site.siteNo}`,
    `Site Name: ${site.siteName}`,
    `P/S: ${site.priority}`,
    "Lessor:",
    "Status:",
    "Monthly Rate:",
    "PF Structure:",
    "Amount:",
  ].join("\n");
}
