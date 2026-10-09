import type { DemandRecord, DemandSummaryMetrics, DemandsFilterState, DemandAssetClass } from "@/types/demands";

export function getDefaultHorizonDates() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  return {
    start: formatDate(start),
    end: formatDate(end),
    preset: 'last-and-current' as const
  };
}

export function filterDemands(
  demands: DemandRecord[],
  filters: DemandsFilterState,
  assetClass: DemandAssetClass
): DemandRecord[] {
  return demands.filter((item) => {
    // 1. Asset class filter (Subpage)
    if (assetClass === 'retail' && item.type === 'INDL') return false;
    if (assetClass === 'industrial' && item.type !== 'INDL') return false;

    // 2. Date Horizon Filter
    if (filters.dateStart && item.date < filters.dateStart) return false;
    if (filters.dateEnd && item.date > filters.dateEnd) return false;

    // 3. Property Type Filter
    if (filters.type && item.type !== filters.type) return false;

    // 4. Region Filter (G.LOC)
    const locations = item.locations?.length ? item.locations : [{ gloc: item.gloc, city: item.city, area: item.location }];
    if (filters.region && !locations.some((location) => location.gloc.toUpperCase() === filters.region.toUpperCase())) return false;

    // 5. Priority Filter
    if (filters.priority && item.priority !== filters.priority) return false;
    if (filters.status && item.status !== filters.status) return false;

    // 6. Search Text
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const combined = `${item.client} ${locations.map((location) => `${location.city} ${location.area} ${location.gloc}`).join(' ')} ${item.industry} ${item.assoc} ${item.status || ''} ${item.actionTaken || ''} ${item.remarks || ''}`.toLowerCase();
      if (!combined.includes(q)) return false;
    }

    return true;
  });
}

export function calculateDemandMetrics(
  filteredDemands: DemandRecord[],
  allDemands: DemandRecord[]
): DemandSummaryMetrics {
  const totalDeals = filteredDemands.length;
  const totalFloorAreaSqm = filteredDemands.reduce((sum, d) => sum + (Number(d.maxSqm) || Number(d.minSqm) || 0), 0);
  const averageDealSizeSqm = totalDeals > 0 ? Math.round(totalFloorAreaSqm / totalDeals) : 0;

  const priorityDeals = filteredDemands.filter((d) => d.priority === 'Priority');
  const priorityDealsCount = priorityDeals.length;
  const priorityFloorAreaSqm = priorityDeals.reduce((sum, d) => sum + (Number(d.maxSqm) || Number(d.minSqm) || 0), 0);

  const retailCount = filteredDemands.filter((d) => d.type === 'CL' || d.type === 'CS').length;
  const industrialCount = filteredDemands.filter((d) => d.type === 'INDL').length;
  const actionRecordedCount = filteredDemands.filter((d) => Boolean(d.actionTaken?.trim())).length;

  return {
    totalDeals,
    totalFloorAreaSqm,
    averageDealSizeSqm,
    priorityDealsCount,
    priorityFloorAreaSqm,
    actionRecordedCount,
    retailCount,
    industrialCount,
    historicalTotalDeals: allDemands.length
  };
}
