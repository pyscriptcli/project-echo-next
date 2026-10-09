import type { DemandSummaryMetrics } from "@/types/demands";

export function DemandsSummary({ metrics, statusCounts }: { metrics: DemandSummaryMetrics; statusCounts: Array<[string, number]> }) {
  const cards = [
    {
      label: "Demands in period",
      value: metrics.totalDeals.toLocaleString(),
      detail: `${metrics.historicalTotalDeals.toLocaleString()} total records`,
      color: "border-[#003366]",
    },
    {
      label: "Required area",
      value: `${metrics.totalFloorAreaSqm.toLocaleString()} sqm`,
      detail: `${metrics.averageDealSizeSqm.toLocaleString()} sqm average`,
      color: "border-[#C9AB4C]",
    },
    {
      label: "Priority demands",
      value: metrics.priorityDealsCount.toLocaleString(),
      detail: `${metrics.priorityFloorAreaSqm.toLocaleString()} sqm required`,
      color: "border-rose-500",
    },
    {
      label: "Action taken recorded",
      value: metrics.actionRecordedCount.toLocaleString(),
      detail: `${Math.max(0, metrics.totalDeals - metrics.actionRecordedCount)} without an action note`,
      color: "border-emerald-600",
    },
    {
      label: "Retail / industrial",
      value: `${metrics.retailCount} / ${metrics.industrialCount}`,
      detail: "Demands in the selected period",
      color: "border-indigo-600",
    },
  ];

  return (
    <div className="space-y-3">
    <section aria-label="Demand summary" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => (
        <article key={card.label} className={`min-h-32 border border-slate-200 border-l-4 ${card.color} bg-[#FFFCFB] p-4 shadow-xs`}>
          <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{card.label}</h2>
          <p className="mt-3 font-serif text-3xl font-bold text-[#003366]">{card.value}</p>
          <p className="mt-2 border-t border-slate-100 pt-2 text-xs text-slate-500">{card.detail}</p>
        </article>
      ))}
    </section>
    <section aria-label="Demand status report" className="flex flex-wrap items-center gap-2 border border-slate-200 bg-[#FFFCFB] px-4 py-3">
      <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Status breakdown</span>
      {statusCounts.length ? statusCounts.map(([status, count]) => <span key={status} className="border border-slate-200 px-2.5 py-1 text-xs text-slate-700"><b>{count}</b> {status}</span>) : <span className="text-xs text-slate-500">No demands in this view</span>}
      <span className="ml-auto text-[10px] text-slate-400">Counts preserve the status text as entered.</span>
    </section>
    </div>
  );
}
