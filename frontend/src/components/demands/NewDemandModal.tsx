"use client";

import React, { useState } from "react";
import { 
  DemandType, 
  DemandPriority, 
  LocationFulfillmentMode, 
  NewDemandInput, 
  DemandLocationInput 
} from "@/types/demands";
import { 
  X, 
  Plus, 
  Trash2, 
  Building2, 
  Shuffle, 
  Layers, 
  Check, 
  MapPin, 
  Calendar,
  AlertCircle,
  HelpCircle,
  Sparkles
} from "lucide-react";

interface NewDemandModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: NewDemandInput) => Promise<void>;
  defaultAssetClass?: "retail" | "industrial" | "all";
}

export function NewDemandModal({
  isOpen,
  onClose,
  onSubmit,
  defaultAssetClass = "all"
}: NewDemandModalProps) {
  const [client, setClient] = useState("");
  const [industry, setIndustry] = useState("");
  const [type, setType] = useState<DemandType>(defaultAssetClass === "industrial" ? "INDL" : "CL");
  const [assoc, setAssoc] = useState("MELIZA");
  const [source, setSource] = useState("Existing Network");
  const [minSqm, setMinSqm] = useState<number>(500);
  const [maxSqm, setMaxSqm] = useState<number>(1000);
  const [priority, setPriority] = useState<DemandPriority>("Normal");
  const [purpose, setPurpose] = useState("Expansion");
  const [timeline, setTimeline] = useState("2026 Q3 / Q4");
  const [remarks, setRemarks] = useState("");
  
  // Dual-intake mode
  const [fulfillmentMode, setFulfillmentMode] = useState<LocationFulfillmentMode>("rollout");

  // Dynamic locations
  const [locations, setLocations] = useState<DemandLocationInput[]>([
    { gloc: "MM", city: "Quezon City", area: "Tomas Morato / Timog", priority: "Primary" },
    { gloc: "MM", city: "Taguig", area: "BGC High Street Corridor", priority: "Secondary" }
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleAddLocation = () => {
    setLocations([
      ...locations,
      { gloc: "MM", city: "Metro Manila", area: "", priority: "Secondary" }
    ]);
  };

  const handleRemoveLocation = (index: number) => {
    if (locations.length <= 1) return;
    setLocations(locations.filter((_, i) => i !== index));
  };

  const handleLocationChange = (index: number, field: keyof DemandLocationInput, value: string) => {
    const updated = [...locations];
    updated[index] = { ...updated[index], [field]: value };
    setLocations(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client.trim() || locations.length === 0) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        client: client.trim(),
        industry: industry.trim() || (type === "INDL" ? "Logistics & Warehousing" : "Retail Services"),
        type,
        assoc: assoc.trim().toUpperCase(),
        source: source.trim(),
        minSqm: Number(minSqm) || 500,
        maxSqm: Number(maxSqm) || Number(minSqm) || 500,
        priority,
        purpose: purpose.trim() || "Expansion",
        timeline: timeline.trim() || "2026",
        remarks: remarks.trim(),
        fulfillmentMode,
        locations
      });
      onClose();
    } catch (err) {
      console.error("Failed to submit new demand", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border-t-4 border-[#C9AB4C] shadow-2xl w-full max-w-3xl my-8 overflow-hidden text-slate-800">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest bg-[#003366] text-[#C9AB4C] px-2 py-0.5">
                CRE Intake Engine
              </span>
              <span className="text-xs text-slate-400 font-semibold">·</span>
              <span className="text-xs font-semibold text-slate-600">Dual Location Processor</span>
            </div>
            <h2 className="font-serif text-2xl font-bold text-[#003366] mt-1">
              Add Corporate Tenant Demand
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Input tenant mandate specifications with automated multi-location rollout duplication or either-or consolidation.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[78vh] overflow-y-auto">
          
          {/* Intake Mode Switcher Banner */}
          <div className="bg-slate-50 border border-slate-200 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#003366]" />
                Location Fulfillment Strategy:
              </label>
              
              <div className="inline-flex border border-slate-300 bg-white">
                <button
                  type="button"
                  onClick={() => setFulfillmentMode("rollout")}
                  className={`px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 transition-colors ${
                    fulfillmentMode === "rollout"
                      ? "bg-[#003366] text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  Multi-Store Rollout (1 Company = N Sites)
                </button>
                <button
                  type="button"
                  onClick={() => setFulfillmentMode("either")}
                  className={`px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 transition-colors ${
                    fulfillmentMode === "either"
                      ? "bg-[#C9AB4C] text-[#003366]"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  Either-Or / Alternative (1 Site from Candidates)
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed">
              {fulfillmentMode === "rollout" ? (
                <>
                  <strong className="text-[#003366]">Multi-Store Rollout Mode:</strong> Client requires a store in <em>each</em> target location (e.g. Puregold 3 sites, KFC 5 sites). Submitting generates <strong>{locations.length} distinct entries</strong> with duplicated company details.
                </>
              ) : (
                <>
                  <strong className="text-amber-800">Either-Or Alternative Mode:</strong> Client seeks <em>only 1 property</em> but provides alternative corridors (e.g. Rebisco plant in Caloocan or Bulacan or Valenzuela). Submitting creates <strong>1 consolidated entry</strong> with ranked target locations.
                </>
              )}
            </p>
          </div>

          {/* Row 1: Client & Industry */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Client / Corporate Brand <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Puregold, KFC, DSV Logistics, Mercury Drug"
                value={client}
                onChange={(e) => setClient(e.target.value)}
                className="w-full h-9 px-3 border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-[#003366] bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Industry / Concept
              </label>
              <input
                type="text"
                placeholder="e.g. F&B, Grocery & Convenience, Warehousing, Health & Beauty"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full h-9 px-3 border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-[#003366] bg-white"
              />
            </div>
          </div>

          {/* Row 2: Property Type, Assoc, Source */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Asset Classification <span className="text-rose-500">*</span>
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as DemandType)}
                className="w-full h-9 px-3 border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-[#003366] bg-white"
              >
                <option value="CL">Commercial Lease (CL)</option>
                <option value="CS">Commercial Space (CS)</option>
                <option value="INDL">Industrial / Logistics (INDL)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Associate in Charge
              </label>
              <select
                value={assoc}
                onChange={(e) => setAssoc(e.target.value)}
                className="w-full h-9 px-3 border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-[#003366] bg-white font-bold"
              >
                <option value="MELIZA">MELIZA</option>
                <option value="DYKSTRA">DYKSTRA</option>
                <option value="CEDTRIX">CEDTRIX</option>
                <option value="PHIL">PHIL</option>
                <option value="CARLO">CARLO</option>
                <option value="ZARAH">ZARAH</option>
                <option value="SONDI">SONDI</option>
                <option value="KRISTINA">KRISTINA</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Lead Source
              </label>
              <input
                type="text"
                placeholder="e.g. Existing Network, Cold Calls, Lamudi, Referral"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full h-9 px-3 border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-[#003366] bg-white"
              />
            </div>
          </div>

          {/* Row 3: Square Meters Requirements */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Minimum Floor Area (sqm) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="10"
                required
                value={minSqm || ""}
                onChange={(e) => setMinSqm(Number(e.target.value))}
                className="w-full h-9 px-3 border border-slate-300 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-[#003366] bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Maximum Floor Area (sqm) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="10"
                required
                value={maxSqm || ""}
                onChange={(e) => setMaxSqm(Number(e.target.value))}
                className="w-full h-9 px-3 border border-slate-300 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-[#003366] bg-white"
              />
            </div>
          </div>

          {/* DYNAMIC TARGET LOCATIONS BUILDER */}
          <div className="border border-slate-200 p-4 bg-slate-50 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#003366] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#C9AB4C]" />
                  Target Locations ({locations.length} {locations.length === 1 ? "Site" : "Sites"})
                </h4>
                <p className="text-[11px] text-slate-500">
                  {fulfillmentMode === "rollout"
                    ? "Each row will generate a dedicated record in the monitoring table and ClickUp archive."
                    : "Alternative candidate locations where any one satisfies the requirement."}
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddLocation}
                className="px-2.5 py-1 text-xs font-bold bg-[#003366] text-white hover:bg-[#002244] transition-colors flex items-center gap-1 shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Location
              </button>
            </div>

            <div className="space-y-2">
              {locations.map((loc, idx) => (
                <div 
                  key={idx} 
                  className="grid grid-cols-12 gap-2 items-center bg-white p-2.5 border border-slate-200 shadow-2xs"
                >
                  <div className="col-span-1 text-center font-mono text-[10px] font-bold text-slate-400">
                    #{idx + 1}
                  </div>

                  <div className="col-span-2">
                    <select
                      value={loc.gloc}
                      onChange={(e) => handleLocationChange(idx, "gloc", e.target.value)}
                      className="w-full h-8 px-2 border border-slate-300 text-xs bg-white font-bold text-slate-700"
                    >
                      <option value="MM">MM (Metro Manila)</option>
                      <option value="N">N (North Luzon)</option>
                      <option value="S">S (South Luzon)</option>
                      <option value="GMM">GMM (Greater MM)</option>
                      <option value="SL">SL (South Laguna/Cavite)</option>
                    </select>
                  </div>

                  <div className="col-span-4">
                    <input
                      type="text"
                      required
                      placeholder="Target City (e.g. Quezon City, Bulacan, Laguna)"
                      value={loc.city}
                      onChange={(e) => handleLocationChange(idx, "city", e.target.value)}
                      className="w-full h-8 px-2.5 border border-slate-300 text-xs text-slate-800"
                    />
                  </div>

                  <div className="col-span-4">
                    <input
                      type="text"
                      required
                      placeholder="Specific Corridor / Area / Street"
                      value={loc.area}
                      onChange={(e) => handleLocationChange(idx, "area", e.target.value)}
                      className="w-full h-8 px-2.5 border border-slate-300 text-xs text-slate-800"
                    />
                  </div>

                  <div className="col-span-1 text-center">
                    <button
                      type="button"
                      disabled={locations.length <= 1}
                      onClick={() => handleRemoveLocation(idx)}
                      className={`p-1 transition-colors ${
                        locations.length <= 1 
                          ? "text-slate-300 cursor-not-allowed" 
                          : "text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                      }`}
                      title="Remove site"
                    >
                      <Trash2 className="w-4 h-4 inline" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Row 4: Priority, Purpose, Timeline */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Priority Level
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as DemandPriority)}
                className="w-full h-9 px-3 border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-[#003366] bg-white font-bold"
              >
                <option value="Normal">Normal</option>
                <option value="Priority">Priority (Urgent)</option>
                <option value="Shelved">Shelved</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Mandate Purpose
              </label>
              <input
                type="text"
                placeholder="e.g. Expansion, New Setup, Identified, Relocation"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full h-9 px-3 border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-[#003366] bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Timeline / Target Opening
              </label>
              <input
                type="text"
                placeholder="e.g. Immediate, 2026 Q4, 2027"
                value={timeline}
                onChange={(e) => setTimeline(e.target.value)}
                className="w-full h-9 px-3 border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-[#003366] bg-white"
              />
            </div>
          </div>

          {/* Row 5: Remarks & Operational Specifications */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Remarks & Technical Specifications
            </label>
            <textarea
              rows={2}
              placeholder="e.g. 10m clear ceiling height, 40ft container access, roadside drive-thru, grease trap, heavy power 3-phase..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full p-2.5 border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-[#003366] bg-white"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              {fulfillmentMode === "rollout" 
                ? `Will generate ${locations.length} demand records.` 
                : "Will generate 1 consolidated alternative demand record."}
            </span>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-[#003366] hover:bg-[#002244] text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                {isSubmitting ? "Creating..." : "Save & Add to Monitoring"}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
}
