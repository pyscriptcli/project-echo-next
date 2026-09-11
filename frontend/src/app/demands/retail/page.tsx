import React from "react";
import DemandsView from "@/components/DemandsView";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Retail Demands & Commercial Space - Project Echo",
  description: "Executive retail tenant requirements, foot-traffic coverage, and rollout pipelines",
};

export default function RetailDemandsPage() {
  return (
    <div className="min-h-screen bg-[#FFFCFB] overflow-y-auto">
      <div className="bg-[#1b1d1e] text-white px-6 py-3 border-b border-[#C9AB4C] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/demands"
            className="text-xs text-slate-300 hover:text-white flex items-center gap-1 font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            All Demands
          </Link>
          <span className="text-slate-600">|</span>
          <span className="text-xs text-blue-400 font-bold uppercase tracking-wider">
            Retail & Commercial Lease (CL / CS) Subpage
          </span>
        </div>
        <Link
          href="/?view=demands&sector=retail"
          className="text-xs bg-[#003366] text-white px-3 py-1 font-bold hover:bg-blue-900 transition-colors"
        >
          Open in Main Workspace
        </Link>
      </div>

      <main className="p-4 md:p-8">
        <DemandsView sector="retail" />
      </main>
    </div>
  );
}
