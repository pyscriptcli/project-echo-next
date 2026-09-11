import React from "react";
import DemandsView from "@/components/DemandsView";
import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";

export const metadata = {
  title: "Demands Monitoring & Intelligence - Project Echo",
  description: "Executive CRE occupier requirements and ClickUp archive",
};

export default function DemandsPage() {
  return (
    <div className="min-h-screen bg-slate-50 overflow-y-auto">
      <div className="bg-[#1b1d1e] text-white px-6 py-3 border-b border-[#C9AB4C] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-xs text-slate-300 hover:text-white flex items-center gap-1 font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Project Echo
          </Link>
          <span className="text-slate-600">|</span>
          <span className="text-xs text-[#C9AB4C] font-bold uppercase tracking-wider">
            Commercial Real Estate Mandates
          </span>
        </div>
        <Link
          href="/?view=demands"
          className="text-xs bg-[#003366] text-white px-3 py-1 font-bold hover:bg-blue-900 transition-colors"
        >
          Open in Main Workspace
        </Link>
      </div>

      <main className="p-4 md:p-8">
        <DemandsView sector="all" />
      </main>
    </div>
  );
}
