import type { DemandSummaryMetrics } from "@/types/demands";

export function DemandsSummary({ metrics, statusCounts }: { metrics: DemandSummaryMetrics; statusCounts: Array<[string, number]> }) {
  const cards = [
    { label: "Demands", value: metrics.totalDeals.toLocaleString() },
    { label: "Required area", value: `${metrics.totalFloorAreaSqm.toLocaleString()} sqm` },
    { label: "Priority", value: metrics.priorityDealsCount.toLocaleString() },
    { label: "Action recorded", value: `${metrics.actionRecordedCount} / ${metrics.totalDeals}` },
  ];

  return (
    <div className="space-y-4">
    <section aria-label="Demand summary" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <article key={card.label} className="border border-slate-200 bg-white p-4">
          <h2 className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{card.label}</h2>
          <p className="mt-3 text-2xl font-semibold tabular-nums text-[#003366]">{card.value}</p>
        </article>
      ))}
    </section>
    <section aria-label="Demand status breakdown" className="flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-slate-200 py-3">
      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Status</span>
      {statusCounts.length ? statusCounts.map(([status, count]) => <span key={status} className="text-xs text-slate-700"><b className="tabular-nums text-[#003366]">{count}</b> {status}</span>) : <span className="text-xs text-slate-500">No demands in this view</span>}
    </section>
    </div>
  );
}
