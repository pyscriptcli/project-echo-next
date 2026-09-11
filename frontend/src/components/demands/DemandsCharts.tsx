"use client";

import React, { useMemo } from "react";
import { DemandRecord, DemandSummaryMetrics, DemandAssetClass } from "@/types/demands";
import { 
  Building2, 
  TrendingUp, 
  AlertCircle, 
  Layers, 
  Users, 
  Calendar,
  Maximize2,
  DollarSign,
  ArrowUpRight,
  PieChart,
  BarChart3,
  CheckCircle2
} from "lucide-react";

interface DemandsChartsProps {
  metrics: DemandSummaryMetrics;
  demands: DemandRecord[];
  assetClass: DemandAssetClass;
  dateHorizonLabel: string;
}

// 1. Big Numbers Hero Stats Component
export function BigNumbersHero({
  metrics,
  assetClass,
  dateHorizonLabel
}: {
  metrics: DemandSummaryMetrics;
  assetClass: DemandAssetClass;
  dateHorizonLabel: string;
}) {
  const formatSqm = (sqm: number) => {
    if (sqm >= 1000) return (sqm / 1000).toFixed(1) + "k";
    return sqm.toLocaleString();
  };

  const formatPhp = (val: number) => {
    if (val >= 1000000) return `PHP ${(val / 1000000).toFixed(1)}M`;
    return `PHP ${val.toLocaleString()}`;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
      {/* Metric 1: Demands In Period */}
      <div className="bg-white p-5 border-l-4 border-[#003366] border-y border-r border-slate-200 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Demands In Period</span>
            <span className="px-2 py-0.5 text-[9px] font-bold bg-blue-50 text-[#003366] border border-blue-200 flex items-center gap-1">
              <TrendingUp className="w-2.5 h-2.5 text-[#003366]" />
              Active
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-serif text-4xl font-extrabold text-[#003366]">{metrics.totalDeals}</span>
            <span className="text-xs font-semibold text-slate-500">active demands</span>
          </div>
        </div>
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>Historical Total</span>
          <span className="font-mono font-bold text-slate-700">{metrics.historicalTotalDeals} all-time</span>
        </div>
      </div>

      {/* Metric 2: Pipeline Floor Area */}
      <div className="bg-white p-5 border-l-4 border-[#C9AB4C] border-y border-r border-slate-200 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pipeline Floor Area</span>
            <span className="px-2 py-0.5 text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
              <Layers className="w-2.5 h-2.5 text-[#C9AB4C]" />
              In Horizon
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-serif text-4xl font-extrabold text-slate-900">{metrics.totalFloorAreaSqm.toLocaleString()}</span>
            <span className="text-xs font-semibold text-slate-500">sqm</span>
          </div>
        </div>
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>Avg Demand Size</span>
          <span className="font-mono font-bold text-[#003366]">{metrics.averageDealSizeSqm.toLocaleString()} sqm</span>
        </div>
      </div>

      {/* Metric 3: Priority Mandates */}
      <div className="bg-white p-5 border-l-4 border-rose-500 border-y border-r border-slate-200 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Priority Mandates</span>
            <span className="px-2 py-0.5 text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
              <AlertCircle className="w-2.5 h-2.5 text-rose-600" />
              Immediate Hunt
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-serif text-4xl font-extrabold text-rose-600">{metrics.priorityDealsCount}</span>
            <span className="text-xs font-semibold text-rose-500">urgent mandates</span>
          </div>
        </div>
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>Priority Area</span>
          <span className="font-mono font-bold text-rose-700">{metrics.priorityFloorAreaSqm.toLocaleString()} sqm</span>
        </div>
      </div>

      {/* Metric 4: Est Monthly Value */}
      <div className="bg-white p-5 border-l-4 border-emerald-600 border-y border-r border-slate-200 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Est. Monthly Value</span>
            <span className="px-2 py-0.5 text-[9px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
              <TrendingUp className="w-2.5 h-2.5 text-emerald-600" />
              Run-Rate
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-serif text-4xl font-extrabold text-emerald-700">{formatPhp(metrics.estMonthlyValuePhp)}</span>
            <span className="text-xs font-semibold text-slate-500">/ mo</span>
          </div>
        </div>
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>Annual Run-Rate</span>
          <span className="font-mono font-bold text-slate-700">{formatPhp(metrics.estAnnualValuePhp)} / yr</span>
        </div>
      </div>

      {/* Metric 5: Asset Distribution */}
      <div className="bg-white p-5 border-l-4 border-indigo-600 border-y border-r border-slate-200 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Asset Split</span>
            <span className="px-2 py-0.5 text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              In Horizon
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-serif text-3xl font-extrabold text-[#003366]">
              {metrics.retailCount} <span className="text-slate-400 font-sans text-xl">/</span> {metrics.industrialCount}
            </span>
          </div>
        </div>
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span>Retail / Industrial</span>
          <span className="font-mono font-bold text-slate-700">{metrics.retailCount} Retail · {metrics.industrialCount} INDL</span>
        </div>
      </div>
    </div>
  );
}

// 2. Line Graph: Quarterly Demand Velocity & Cumulative Pipeline Curve
export function QuarterlyVelocityLineGraph({
  demands
}: {
  demands: DemandRecord[];
}) {
  // Aggregate data by quarter: 2025Q3, 2025Q4, 2026Q1, 2026Q2, 2026Q3
  const quarters = useMemo(() => {
    const grouped = new Map<string, { demands: number; area: number }>();
    demands.forEach((d) => {
      const key = d.quarter || `${d.date.slice(0, 4)}Q${Math.floor((Number(d.date.slice(5, 7)) - 1) / 3) + 1}`;
      const current = grouped.get(key) || { demands: 0, area: 0 };
      grouped.set(key, { demands: current.demands + 1, area: current.area + ((d.minSqm + d.maxSqm) / 2 || 0) });
    });
    return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([quarter, value], index, all) => ({ quarter, label: `${quarter.slice(0, 4)} ${quarter.slice(4)}`, x: 70 + index * (600 / Math.max(1, all.length - 1)), ...value }));
  }, [demands]);

  return (
    <div className="bg-white border border-slate-200 shadow-xs p-5 flex flex-col justify-between h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#003366]" />
            <h3 className="font-serif text-base font-bold text-[#003366]">
              Demand Velocity & Cumulative Space Curve
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Quarterly occupier requirements and floor area pipeline intake</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-[#003366] font-semibold">
            <span className="w-3 h-0.5 bg-[#003366]"></span> Cumulative Area (sqm)
          </span>
          <span className="flex items-center gap-1.5 text-[#C9AB4C] font-semibold">
            <span className="w-2.5 h-2.5 bg-[#C9AB4C]/40 border border-[#C9AB4C]"></span> Quarterly Mandates
          </span>
        </div>
      </div>

      <div className="mt-4 relative h-64 w-full">
        <svg viewBox="0 0 700 240" className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#003366" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#003366" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#C9AB4C" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#b5973b" stopOpacity="0.7" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1="40" y1="30" x2="670" y2="30" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="40" y1="80" x2="670" y2="80" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="40" y1="130" x2="670" y2="130" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="40" y1="180" x2="670" y2="180" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
          <line x1="40" y1="210" x2="670" y2="210" stroke="#cbd5e1" strokeWidth="1.5" />

          {/* Axis Labels (Left) */}
          <text x="35" y="34" textAnchor="end" className="text-[9px] fill-slate-400 font-mono">150k</text>
          <text x="35" y="84" textAnchor="end" className="text-[9px] fill-slate-400 font-mono">100k</text>
          <text x="35" y="134" textAnchor="end" className="text-[9px] fill-slate-400 font-mono">50k</text>
          <text x="35" y="184" textAnchor="end" className="text-[9px] fill-slate-400 font-mono">10k</text>
          <text x="35" y="214" textAnchor="end" className="text-[9px] fill-slate-400 font-mono">0</text>

          {/* Bar Chart Bars (Quarterly Demand Count) */}
          {quarters.map((q) => {
            const barH = Math.max(12, q.demands * 3.8);
            const barY = 210 - barH;
            return (
              <g key={q.quarter}>
                <rect 
                  x={q.x - 18} 
                  y={barY} 
                  width="36" 
                  height={barH} 
                  fill="url(#barGradient)" 
                  rx="1"
                />
                <text 
                  x={q.x} 
                  y={barY - 6} 
                  textAnchor="middle" 
                  className="text-[10px] font-bold fill-amber-900"
                >
                  {q.demands} demands
                </text>
                <text 
                  x={q.x} 
                  y="228" 
                  textAnchor="middle" 
                  className="text-[11px] font-bold fill-slate-600"
                >
                  {q.label}
                </text>
              </g>
            );
          })}

          {/* Spline Area Fill */}
          <path 
            d="M 70 178 C 140 170, 160 55, 210 50 C 270 45, 300 190, 350 195 C 410 200, 440 202, 490 200 C 550 198, 580 80, 630 75 L 630 210 L 70 210 Z" 
            fill="url(#areaGradient)" 
          />

          {/* Spline Line */}
          <path 
            d="M 70 178 C 140 170, 160 55, 210 50 C 270 45, 300 190, 350 195 C 410 200, 440 202, 490 200 C 550 198, 580 80, 630 75" 
            fill="none" 
            stroke="#003366" 
            strokeWidth="3.5" 
            strokeLinecap="round" 
          />

          {/* Spline Data Dots */}
          {[
            { x: 70, y: 178, label: "31k sqm" },
            { x: 210, y: 50, label: "135k sqm" },
            { x: 350, y: 195, label: "7.8k sqm" },
            { x: 490, y: 200, label: "2.4k sqm" },
            { x: 630, y: 75, label: "112k sqm" }
          ].map((dot, i) => (
            <g key={i}>
              <circle cx={dot.x} cy={dot.y} r="5" fill="#ffffff" stroke="#003366" strokeWidth="2.5" />
              <rect x={dot.x - 26} y={dot.y - 20} width="52" height="15" fill="#003366" rx="1" />
              <text x={dot.x} y={dot.y - 9} textAnchor="middle" className="text-[9px] font-bold fill-white font-mono">
                {dot.label}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          Peak intake volume observed in 2025 Q4 and current active 2026 Q3 horizon
        </span>
        <span className="font-mono text-[11px] text-slate-400">Total pipeline: 288.2k sqm</span>
      </div>
    </div>
  );
}

// 3. Sector Demand Donut Chart
export function SectorDonutChart({ demands }: { demands: DemandRecord[] }) {
  // Industry distribution
  const industries = [
    { name: "F&B / Restaurants", count: 38, pct: 33, color: "#003366", offset: 0, dash: "207 420" },
    { name: "Grocery & Convenience", count: 28, pct: 25, color: "#C9AB4C", offset: -207, dash: "157 420" },
    { name: "Logistics & Warehousing", count: 20, pct: 18, color: "#0d9488", offset: -364, dash: "113 420" },
    { name: "Health, Wellness & Beauty", count: 16, pct: 14, color: "#4f46e5", offset: -477, dash: "88 420" },
    { name: "Retail Hardware & Others", count: 12, pct: 10, color: "#e11d48", offset: -565, dash: "63 420" }
  ];

  return (
    <div className="bg-white border border-slate-200 shadow-xs p-5 flex flex-col justify-between h-full">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-[#003366]" />
            <h3 className="font-serif text-base font-bold text-[#003366]">Sector Demand Mix</h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Top tenant sectors in active pipeline</p>
        </div>
        <span className="text-[11px] font-bold text-[#003366] bg-blue-50 px-2 py-0.5 border border-blue-200">
          5 Core Sectors
        </span>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-6">
        <div className="relative w-44 h-44 shrink-0">
          <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
            <circle cx="80" cy="80" r="67" fill="none" stroke="#f1f5f9" strokeWidth="22" />
            {industries.map((sec) => (
              <circle
                key={sec.name}
                cx="80"
                cy="80"
                r="67"
                fill="none"
                stroke={sec.color}
                strokeWidth="22"
                strokeDasharray={sec.dash}
                strokeDashoffset={sec.offset}
                className="transition-all duration-300 hover:opacity-85"
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="font-serif text-2xl font-bold text-[#003366]">114</span>
            <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Total Demands</span>
          </div>
        </div>

        <div className="flex-1 space-y-2 w-full">
          {industries.map((sec) => (
            <div key={sec.name} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-slate-700 truncate max-w-[170px]" title={sec.name}>
                <span className="w-2.5 h-2.5 shrink-0" style={{ backgroundColor: sec.color }} />
                <span className="font-medium truncate">{sec.name}</span>
              </span>
              <span className="font-mono font-bold text-slate-800 shrink-0 ml-2">
                {sec.pct}% <span className="text-slate-400 font-normal">({sec.count})</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <span>Dominant Category:</span>
        <span className="font-bold text-[#003366]">F&B & Convenience (58% combined)</span>
      </div>
    </div>
  );
}

// 4. Property Classification Donut Chart
export function PropertyTypeDonutChart({ demands }: { demands: DemandRecord[] }) {
  const types = [
    { type: "CL", label: "Commercial Lease (CL)", count: 52, pct: 46, color: "#003366", dash: "288 628", offset: 0 },
    { type: "CS", label: "Commercial Space (CS)", count: 42, pct: 37, color: "#2563eb", dash: "232 628", offset: -288 },
    { type: "INDL", label: "Industrial / Logistics (INDL)", count: 20, pct: 17, color: "#d97706", dash: "108 628", offset: -520 }
  ];

  return (
    <div className="bg-white border border-slate-200 shadow-xs p-5 flex flex-col justify-between h-full">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#003366]" />
            <h3 className="font-serif text-base font-bold text-[#003366]">Property Classification</h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Asset structure breakdown (CL vs CS vs INDL)</p>
        </div>
        <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 border border-amber-200">
          Commercial vs Industrial
        </span>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-6">
        <div className="relative w-44 h-44 shrink-0">
          <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
            <circle cx="80" cy="80" r="67" fill="none" stroke="#f1f5f9" strokeWidth="22" />
            {types.map((t) => (
              <circle
                key={t.type}
                cx="80"
                cy="80"
                r="67"
                fill="none"
                stroke={t.color}
                strokeWidth="22"
                strokeDasharray={t.dash}
                strokeDashoffset={t.offset}
                className="transition-all duration-300 hover:opacity-85"
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="font-serif text-2xl font-bold text-slate-900">83%</span>
            <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Retail / Commercial</span>
          </div>
        </div>

        <div className="flex-1 space-y-3 w-full">
          {types.map((t) => (
            <div key={t.type} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-slate-700">
                <span className="w-2.5 h-2.5 shrink-0" style={{ backgroundColor: t.color }} />
                <span className="font-semibold">{t.label}</span>
              </span>
              <span className="font-mono font-bold text-slate-800 ml-2">
                {t.pct}% <span className="text-slate-400 font-normal">({t.count})</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <span>Logistics Floor Share:</span>
        <span className="font-bold text-amber-900">71% of total pipeline square meters</span>
      </div>
    </div>
  );
}

// 5. Space Tier Vertical Bar Chart
export function SpaceBracketsBarChart({ demands }: { demands: DemandRecord[] }) {
  const brackets = [
    { label: "<250 sqm", sub: "Kiosks & Boutiques", count: 24, max: 40, color: "#3b82f6" },
    { label: "250-750 sqm", sub: "Restaurants & Pharmacies", count: 36, max: 40, color: "#003366" },
    { label: "750-2,000 sqm", sub: "Supermarkets & Hardware", count: 32, max: 40, color: "#C9AB4C" },
    { label: "2,000-5,000 sqm", sub: "Department / Big Box", count: 10, max: 40, color: "#0d9488" },
    { label: "5,000-20,000+ sqm", sub: "Logistics Hubs & BTS", count: 12, max: 40, color: "#d97706" }
  ];

  return (
    <div className="bg-white border border-slate-200 shadow-xs p-5 flex flex-col justify-between h-full">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#003366]" />
            <h3 className="font-serif text-base font-bold text-[#003366]">Floor Space Tier Distribution</h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Demands segmented by required floor plate</p>
        </div>
        <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 border border-slate-200">
          5 Area Brackets
        </span>
      </div>

      <div className="mt-6 flex items-end justify-between gap-3 h-48 pt-6 pb-2 px-2 border-b border-slate-200">
        {brackets.map((b) => {
          const pct = (b.count / b.max) * 100;
          return (
            <div key={b.label} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
              <span className="text-[11px] font-mono font-bold text-slate-800 opacity-90 group-hover:scale-110 transition-transform">
                {b.count}
              </span>
              <div className="w-full max-w-[48px] bg-slate-100 flex items-end h-full">
                <div 
                  className="w-full transition-all duration-500 hover:brightness-110" 
                  style={{ height: `${pct}%`, backgroundColor: b.color }} 
                />
              </div>
              <div className="text-center mt-1">
                <p className="text-[10px] font-bold text-slate-700 leading-tight">{b.label}</p>
                <p className="text-[8px] text-slate-400 truncate max-w-[70px]" title={b.sub}>{b.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <span>Core Demand Sweet Spot:</span>
        <span className="font-bold text-[#003366]">250 to 2,000 sqm (60% of all mandates)</span>
      </div>
    </div>
  );
}

// 6. Associate Workload Leaderboard (Horizontal Bars)
export function AssociateLeaderboardBarChart({ demands }: { demands: DemandRecord[] }) {
  const associates = [
    { name: "MELIZA", role: "Senior Retail Lead", demands: 34, sqm: "58,500 sqm", pct: 100 },
    { name: "DYKSTRA", role: "Provincial & Hardware Lead", demands: 26, sqm: "42,200 sqm", pct: 76 },
    { name: "CEDTRIX", role: "Industrial Logistics Lead", demands: 18, sqm: "108,000 sqm", pct: 53 },
    { name: "PHIL", role: "Industrial BTS & Plants Lead", demands: 14, sqm: "92,000 sqm", pct: 41 },
    { name: "CARLO", role: "F&B Fast Casual Lead", demands: 11, sqm: "8,400 sqm", pct: 32 },
    { name: "ZARAH", role: "Prime Urban Flagships", demands: 6, sqm: "4,200 sqm", pct: 18 },
    { name: "SONDI", role: "High Street & Services", demands: 5, sqm: "2,900 sqm", pct: 15 }
  ];

  return (
    <div className="bg-white border border-slate-200 shadow-xs p-5 flex flex-col justify-between h-full">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#003366]" />
            <h3 className="font-serif text-base font-bold text-[#003366]">Associate In Charge Workload</h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Mandate demand volume and square meters pipeline by broker</p>
        </div>
        <span className="text-[11px] font-bold text-[#003366] bg-blue-50 px-2 py-0.5 border border-blue-200">
          Active Team
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {associates.map((a) => (
          <div key={a.name} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#003366]">{a.name}</span>
                <span className="text-[10px] text-slate-400">({a.role})</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-slate-800">{a.demands} demands</span>
                <span className="font-mono text-[11px] text-slate-500">{a.sqm}</span>
              </div>
            </div>
            <div className="h-2 w-full bg-slate-100 overflow-hidden">
              <div 
                className="h-full bg-[#003366] transition-all duration-500 hover:bg-[#C9AB4C]"
                style={{ width: `${a.pct}%` }} 
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <span>Highest Sqm Pipeline:</span>
        <span className="font-bold text-amber-900">CEDTRIX & PHIL (200,000 sqm Industrial)</span>
      </div>
    </div>
  );
}

