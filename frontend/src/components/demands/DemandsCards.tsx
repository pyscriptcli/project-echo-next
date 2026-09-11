"use client";

import React from "react";
import { DemandAssetClass } from "@/types/demands";
import { 
  MapPin, 
  TrendingUp, 
  Calendar, 
  CheckCircle2, 
  ArrowRight, 
  Layers, 
  Building2, 
  Truck, 
  Clock, 
  Sparkles,
  Compass,
  Zap,
  Target
} from "lucide-react";

interface DemandsCardsProps {
  assetClass: DemandAssetClass;
}

export function DemandsCards({ assetClass }: DemandsCardsProps) {
  const isIndustrial = assetClass === "industrial";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* CARD 1: LOCATION COVERAGE */}
      <div className="bg-[#FFFCFB] border border-slate-200 shadow-xs p-5 flex flex-col justify-between hover:border-[#003366] transition-colors">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-50 text-[#003366] border border-blue-200">
                <Compass className="w-4 h-4" />
              </span>
              <div>
                <h3 className="font-serif text-base font-bold text-[#003366]">
                  Location Coverage
                </h3>
                <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                  {isIndustrial ? "Logistics Belts & Corridors" : "Retail Foot-Traffic Corridors"}
                </p>
              </div>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 border ${
              isIndustrial ? "bg-amber-50 text-amber-900 border-amber-200" : "bg-blue-50 text-blue-900 border-blue-200"
            }`}>
              {isIndustrial ? "Heavy Logistics" : "Prime High-Street"}
            </span>
          </div>

          <div className="mt-4 space-y-3.5 text-xs">
            {isIndustrial ? (
              <>
                <div className="bg-[#FFFCFB] p-3 border-l-2 border-amber-600 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">North Logistics Belt (Bulacan / Valenzuela / Caloocan)</span>
                    <span className="font-mono text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2">48% Demands</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    High demand in Marilao and Meycauayan for NLEX-accessible distribution centers and 40ft container turning radiuses.
                  </p>
                </div>

                <div className="bg-[#FFFCFB] p-3 border-l-2 border-[#003366] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">South Logistics Hub (Laguna / Cavite / Batangas)</span>
                    <span className="font-mono text-[10px] font-bold text-[#003366] bg-blue-100 px-1.5 py-0.2">42% Demands</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Concentrated in Santa Rosa, Calamba, and General Trias for 3PL facilities, manufacturing plants, and cold storage hubs.
                  </p>
                </div>

                <div className="bg-[#FFFCFB] p-3 border-l-2 border-emerald-600 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">Port & Cross-Dock Nodes (Batangas Port / Manila Harbor)</span>
                    <span className="font-mono text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2">10% Demands</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Dedicated requirements for automotive vehicle processing, heavy open yard staging, and intermodal freight transfer.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="bg-[#FFFCFB] p-3 border-l-2 border-[#003366] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">Metro Manila Prime Commercial (QC / BGC / Makati)</span>
                    <span className="font-mono text-[10px] font-bold text-[#003366] bg-blue-100 px-1.5 py-0.2">54% Demands</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Concentrated in Tomas Morato, Timog, BGC High Street, and Makati CBD. Focus on flagship dining, gourmet groceries, and medical clinics.
                  </p>
                </div>

                <div className="bg-[#FFFCFB] p-3 border-l-2 border-[#C9AB4C] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">Provincial Growth Clusters (Pampanga / Bulacan / Cavite)</span>
                    <span className="font-mono text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2">32% Demands</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Rapid network rollouts across San Fernando, Lubao, Guagua, and Plaridel driven by supermarket and pharmacy multi-branch expansion.
                  </p>
                </div>

                <div className="bg-[#FFFCFB] p-3 border-l-2 border-emerald-600 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">Southern Hardware & Resort Nodes (Batangas / Baguio)</span>
                    <span className="font-mono text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2">14% Demands</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    MR. DIY 6-store Batangas cluster, Baguio City Center convenience rollouts, and standalone community hardware big-boxes.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1 font-semibold text-[#003366]">
            <MapPin className="w-3.5 h-3.5 text-[#C9AB4C]" />
            {isIndustrial ? "North & South Mega Corridors Active" : "8 Key Geographic Zones Monitored"}
          </span>
          <span className="font-mono font-bold text-slate-700">100% Geo Mapped</span>
        </div>
      </div>

      {/* CARD 2: INDUSTRY TREND */}
      <div className="bg-[#FFFCFB] border border-slate-200 shadow-xs p-5 flex flex-col justify-between hover:border-[#003366] transition-colors">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-amber-50 text-amber-800 border border-amber-200">
                <TrendingUp className="w-4 h-4" />
              </span>
              <div>
                <h3 className="font-serif text-base font-bold text-[#003366]">
                  Industry Trend
                </h3>
                <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                  {isIndustrial ? "Operational Specs & Concessions" : "Leasing Norms & Concessions"}
                </p>
              </div>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 border ${
              isIndustrial ? "bg-amber-50 text-amber-900 border-amber-200" : "bg-blue-50 text-blue-900 border-blue-200"
            }`}>
              {isIndustrial ? "BTS vs Speculative" : "Tenant Concessions"}
            </span>
          </div>

          <div className="mt-4 space-y-3.5 text-xs">
            {isIndustrial ? (
              <>
                <div className="border border-slate-200 p-3 bg-[#FFFCFB] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#003366]">Clear Ceiling Heights</span>
                    <span className="font-mono font-bold text-amber-700">10m – 12m Standard</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    E-commerce and 3PL operators (Shopee, J&T, DSV) strictly require 10m+ clear heights for vertical pallet racking and multi-tier mezzanine picking.
                  </p>
                </div>

                <div className="border border-slate-200 p-3 bg-[#FFFCFB] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#003366]">Floor Load & Dock Levelers</span>
                    <span className="font-mono font-bold text-amber-700">5 Ton/sqm + Docks</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Heavy floor slab loading (5 to 7 tons/sqm) with laser-screed flatness. Minimum 1 elevated dock leveler per 1,000 sqm warehouse footprint.
                  </p>
                </div>

                <div className="border border-slate-200 p-3 bg-[#FFFCFB] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#003366]">Built-to-Suit (BTS) Preference</span>
                    <span className="font-mono font-bold text-[#003366]">10–15 Year Leases</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    F&B manufacturing and cold storage tenants prefer long-term Built-to-Suit lease contracts over standard ready-built facilities (RBF).
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="border border-slate-200 p-3 bg-[#FFFCFB] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#003366]">Fit-out Rent-Free Period</span>
                    <span className="font-mono font-bold text-blue-700">60 to 90 Days</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Major F&B restaurant groups (Bistro Group, KFC, Shake Shack) require 60 to 90 days rent-free fit-out concessions before commencement.
                  </p>
                </div>

                <div className="border border-slate-200 p-3 bg-[#FFFCFB] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#003366]">Multi-Store Rollout Pipeline</span>
                    <span className="font-mono font-bold text-[#003366]">1 Brand · N Sites</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Aggressive expansion models from Puregold (3 sites), Mercury Drug (5 sites in Pampanga), MR. DIY (6 sites in Batangas), and KFC (5 sites).
                  </p>
                </div>

                <div className="border border-slate-200 p-3 bg-[#FFFCFB] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#003366]">Utility Load & Grease Traps</span>
                    <span className="font-mono font-bold text-amber-800">3-Phase 100A+</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    Commercial leases prioritize roadside standalone units with dedicated grease trap drainage, 24/7 HVAC provision, and customer parking.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1 font-semibold text-[#003366]">
            <Zap className="w-3.5 h-3.5 text-[#C9AB4C]" />
            {isIndustrial ? "Logistics Infrastructure Demand" : "Tenant Concessions Benchmarked"}
          </span>
          <span className="font-mono font-bold text-slate-700">Market Standard</span>
        </div>
      </div>

      {/* CARD 3: TIMELINE & ROLLOUT PHASES */}
      <div className="bg-[#FFFCFB] border border-slate-200 shadow-xs p-5 flex flex-col justify-between hover:border-[#003366] transition-colors">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200">
                <Calendar className="w-4 h-4" />
              </span>
              <div>
                <h3 className="font-serif text-base font-bold text-[#003366]">
                  Timeline & Rollouts
                </h3>
                <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                  {isIndustrial ? "Facility Handover & BTS Phasing" : "Opening Horizons & Lease Targets"}
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 border bg-emerald-50 text-emerald-900 border-emerald-200">
              Rollout Pipeline
            </span>
          </div>

          <div className="mt-4 space-y-3.5 text-xs">
            {isIndustrial ? (
              <>
                <div className="flex items-start gap-3 p-3 bg-[#FFFCFB] border border-slate-200">
                  <div className="p-1.5 bg-[#003366] text-white shrink-0 font-bold text-[10px] font-mono">
                    2026 Q3
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">Immediate Overflow Warehousing</h4>
                    <p className="text-slate-600 text-[11px] mt-0.5 leading-relaxed">
                      Urgent 10,000 sqm dry warehouse search for DSV / DB Schenker and J&T Express peak holiday sorting surge.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-[#FFFCFB] border border-slate-200">
                  <div className="p-1.5 bg-[#C9AB4C] text-[#003366] shrink-0 font-bold text-[10px] font-mono">
                    2026 Q4
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">Cold Storage & Cross-Dock Hubs</h4>
                    <p className="text-slate-600 text-[11px] mt-0.5 leading-relaxed">
                      Shopee Express Bulacan hub lease sign-off and Glacier Megafridge Cavite temperature-controlled facility construction handover.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-[#FFFCFB] border border-slate-200">
                  <div className="p-1.5 bg-slate-800 text-white shrink-0 font-bold text-[10px] font-mono">
                    2027+
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">Major BTS Manufacturing Plants</h4>
                    <p className="text-slate-600 text-[11px] mt-0.5 leading-relaxed">
                      Universal Robina Corp (URC) 25,000 sqm plant groundbreaking and Rebisco North MM corridor candidate area selection.
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start gap-3 p-3 bg-[#FFFCFB] border border-slate-200">
                  <div className="p-1.5 bg-[#003366] text-white shrink-0 font-bold text-[10px] font-mono">
                    2026 Q3
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">Immediate Fast-Casual Rollouts</h4>
                    <p className="text-slate-600 text-[11px] mt-0.5 leading-relaxed">
                      Angels Pizza, 24 Chicken, and LA Chicks fast-casual food outlets targeting turn-key spaces with existing exhaust ducts.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-[#FFFCFB] border border-slate-200">
                  <div className="p-1.5 bg-[#C9AB4C] text-[#003366] shrink-0 font-bold text-[10px] font-mono">
                    2026 Q4
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">Supermarket & Pharmacy Expansion</h4>
                    <p className="text-slate-600 text-[11px] mt-0.5 leading-relaxed">
                      Puregold 3-store cluster handover and Mercury Drug Pampanga 5-branch phased opening for year-end consumer traffic.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-[#FFFCFB] border border-slate-200">
                  <div className="p-1.5 bg-slate-800 text-white shrink-0 font-bold text-[10px] font-mono">
                    2027–28
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">Flagship High-Street Openings</h4>
                    <p className="text-slate-600 text-[11px] mt-0.5 leading-relaxed">
                      KFC BGC flagship (2027), The Marketplace Baguio flagship (2028), and Shopwise 3,500 sqm podium development.
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1 font-semibold text-[#003366]">
            <Clock className="w-3.5 h-3.5 text-[#003366]" />
            Active Target Horizons
          </span>
          <span className="font-mono font-bold text-slate-700">Q3 2026 – 2028</span>
        </div>
      </div>
    </div>
  );
}
