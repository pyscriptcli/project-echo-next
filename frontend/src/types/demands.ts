export type DemandType = 'CL' | 'CS' | 'INDL';
export type DemandPriority = 'Priority' | 'Normal' | 'Shelved' | 'Low';
export type DemandAssetClass = 'all' | 'retail' | 'industrial';
export type DemandViewMode = 'dashboard' | 'table' | 'clickup';
export type DatePreset = 'last-and-current' | 'last-90' | 'year' | 'all' | 'custom';
export type LocationFulfillmentMode = 'rollout' | 'either';

export interface DemandRecord {
  id: number | string;
  date: string; // YYYY-MM-DD
  quarter?: string; // e.g. 2026Q3
  assoc: string;
  source: string;
  type: DemandType;
  industry: string;
  client: string;
  minSqm: number;
  maxSqm: number;
  gloc: string; // MM, N, S, GMM, SL, etc.
  city: string;
  location: string;
  priority: DemandPriority;
  purpose?: string;
  timeline?: string;
  status: string;
  remarks?: string;
  clickUpTaskId?: string;
  clickUpUrl?: string;
  fulfillmentMode?: LocationFulfillmentMode;
  alternativeLocations?: string[];
}

export interface DemandLocationInput {
  gloc: string;
  city: string;
  area: string;
  priority?: 'Primary' | 'Secondary' | 'Tertiary';
}

export interface NewDemandInput {
  client: string;
  industry: string;
  type: DemandType;
  assoc: string;
  source: string;
  minSqm: number;
  maxSqm: number;
  priority: DemandPriority;
  purpose: string;
  timeline: string;
  remarks: string;
  fulfillmentMode: LocationFulfillmentMode;
  locations: DemandLocationInput[];
}

export interface DemandsFilterState {
  search: string;
  type: string;
  region: string;
  priority: string;
  dateStart: string;
  dateEnd: string;
  preset: DatePreset;
}

export interface DemandSummaryMetrics {
  totalDeals: number;
  totalFloorAreaSqm: number;
  averageDealSizeSqm: number;
  priorityDealsCount: number;
  priorityFloorAreaSqm: number;
  estMonthlyValuePhp: number;
  estAnnualValuePhp: number;
  retailCount: number;
  industrialCount: number;
  historicalTotalDeals: number;
}
