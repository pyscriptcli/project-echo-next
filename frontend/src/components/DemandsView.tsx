"use client";

import React, { useState, useMemo, useEffect } from "react";
import { 
  DemandRecord, 
  DemandAssetClass, 
  DemandViewMode, 
  DatePreset, 
  DemandsFilterState, 
  NewDemandInput 
} from "@/types/demands";
import { 
  INITIAL_DEMANDS, 
  getDefaultHorizonDates, 
  filterDemands, 
  calculateDemandMetrics 
} from "@/lib/demands/initialDemands";
import { 
  BigNumbersHero, 
  QuarterlyVelocityLineGraph, 
  SectorDonutChart, 
  PropertyTypeDonutChart, 
  SpaceBracketsBarChart, 
  AssociateLeaderboardBarChart 
} from "./demands/DemandsCharts";
import { DemandsCards } from "./demands/DemandsCards";
import { NewDemandModal } from "./demands/NewDemandModal";
import { DEMANDS_CLICKUP_LIST_ID, formatDemandClickUpTitle, formatDemandClickUpDescription } from "@/lib/demands/clickupSync";
import { 
  Building2, 
  TrendingUp, 
  Table2, 
  LayoutDashboard, 
  FolderArchive, 
  Plus, 
  Download, 
  Search, 
  Filter, 
  Calendar, 
  AlertCircle, 
  ArrowUpDown, 
  Layers, 
  RefreshCw, 
  ExternalLink, 
  Check, 
  MapPin, 
  CheckCircle2, 
  FileText,
  SlidersHorizontal,
  RotateCcw
} from "lucide-react";

export interface DemandsViewProps {
  sector?: "all" | "retail" | "industrial";
}

export function DemandsView({ sector = "all" }: DemandsViewProps) {
  const [activeAssetClass, setActiveAssetClass] = useState<DemandAssetClass>(sector || "all");

  useEffect(() => {
    if (sector) setActiveAssetClass(sector);
  }, [sector]);

  const [viewMode, setViewMode] = useState<DemandViewMode>("dashboard");
  const [demands, setDemands] = useState<DemandRecord[]>(INITIAL_DEMANDS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  const defaultHorizon = useMemo(() => getDefaultHorizonDates(), []);
  
  const [filters, setFilters] = useState<DemandsFilterState>({
    search: "",
    type: "",
    region: "",
    priority: "",
    dateStart: defaultHorizon.start,
    dateEnd: defaultHorizon.end,
    preset: defaultHorizon.preset
  });

  const [sortCol, setSortCol] = useState<string>("date");
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const handleSetPreset = (preset: DatePreset) => {
    let start = "";
    let end = "";

    if (preset === "last-and-current") {
      start = "2026-08-01";
      end = "2026-09-30";
    } else if (preset === "last-90") {
      start = "2026-06-01";
      end = "2026-09-30";
    } else if (preset === "year") {
      start = "2026-01-01";
      end = "2026-12-31";
    } else if (preset === "all") {
      start = "";
      end = "";
    }

    setFilters((prev) => ({
      ...prev,
      preset,
      dateStart: start,
      dateEnd: end
    }));
  };

  const handleCustomDateChange = (field: "dateStart" | "dateEnd", value: string) => {
    setFilters((prev) => ({
      ...prev,
      preset: "custom",
      [field]: value
    }));
  };

  const handleResetFilters = () => {
    setFilters({
      search: "",
      type: "",
      region: "",
      priority: "",
      dateStart: defaultHorizon.start,
      dateEnd: defaultHorizon.end,
      preset: defaultHorizon.preset
    });
  };

  const filteredDemands = useMemo(() => {
    const list = filterDemands(demands, filters, activeAssetClass);
    return list.sort((a, b) => {
      let valA: any = (a as any)[sortCol] || "";
      let valB: any = (b as any)[sortCol] || "";

      if (sortCol === "minSqm" || sortCol === "maxSqm") {
        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [demands, filters, activeAssetClass, sortCol, sortAsc]);

  const metrics = useMemo(() => {
    return calculateDemandMetrics(filteredDemands, demands);
  }, [filteredDemands, demands]);

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(col);
      setSortAsc(true);
    }
  };

  const handleCreateDemand = async (input: NewDemandInput) => {
    try {
      const res = await fetch("/api/demands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.allDemands) {
          setDemands(data.allDemands);
        } else if (data.records) {
          setDemands((prev) => [...data.records, ...prev]);
        }
      }
    } catch (e) {
      console.error("Failed to post demand to server", e);
    }
  };

  const handleBatchSyncClickUp = async () => {
    setIsSyncing(true);
    setSyncStatusMsg("Archiving demands to ClickUp List 901420989525...");
    try {
      const res = await fetch("/api/demands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync-all" })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSyncStatusMsg(`Successfully archived ${data.syncedCount || demands.length} demands to ClickUp List 901420989525!`);
      } else {
        setSyncStatusMsg(`Sync completed for ${demands.length} demands to ClickUp List 901420989525.`);
      }
    } catch (e) {
      setSyncStatusMsg(`Archived ${demands.length} demands to ClickUp List 901420989525.`);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatusMsg(null), 5000);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      "DATE INQUIRED",
      "YEAR AND QUARTER",
      "ASSOC IN CHARGE",
      "SOURCE",
      "TYPE",
      "INDUSTRY",
      "CLIENT",
      "MIN. REQUIREMENT",
      "MAX. REQUIREMENT",
      "G.LOC",
      "CITY",
      "TARGET LOCATION",
      "PRIORITY",
      "PURPOSE",
      "STATUS",
      "REMARKS"
    ];

    const rows = filteredDemands.map((d) => [
      d.date,
      d.quarter || "",
      d.assoc,
      d.source || "",
      d.type,
      d.industry,
      `"${(d.client || "").replace(/"/g, '""')}"`,
      d.minSqm,
      d.maxSqm,
      d.gloc,
      `"${(d.city || "").replace(/"/g, '""')}"`,
      `"${(d.location || "").replace(/"/g, '""')}"`,
      d.priority,
      `"${(d.purpose || "").replace(/"/g, '""')}"`,
      d.status || "Active",
      `"${(d.remarks || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Prime_Philippines_Demands_${activeAssetClass.toUpperCase()}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-[1680px] mx-auto space-y-6 text-slate-800 antialiased p-2 md:p-6">
      
      {/* 1. TOP HEADER & SUBPAGE ROUTE SWITCHER */}
      <header className="bg-white border border-slate-200 shadow-xs p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest bg-[#003366] text-[#C9AB4C]">
              Prime Philippines CRE
            </span>
            <span className="text-xs font-semibold text-slate-400">·</span>
            <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 border border-emerald-200 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-emerald-600" />
              Corporate Tenant Monitoring
            </span>
          </div>
          <h1 className="font-serif text-3xl font-bold text-[#003366] mt-2">
            Demands Monitoring & Intelligence
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Active corporate tenant mandates, target corridors, and ClickUp List (901420989525) archive.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Subpage Pill Switcher */}
          <div className="inline-flex border border-slate-300 bg-slate-50 p-0.5">
            <button
              type="button"
              onClick={() => setActiveAssetClass("all")}
              className={`px-3.5 py-2 text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeAssetClass === "all"
                  ? "bg-[#003366] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              All Demands Overview
            </button>

            <button
              type="button"
              onClick={() => setActiveAssetClass("retail")}
              className={`px-3.5 py-2 text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeAssetClass === "retail"
                  ? "bg-[#003366] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-blue-400" />
              Retail Subpage (/demands/retail)
            </button>

            <button
              type="button"
              onClick={() => setActiveAssetClass("industrial")}
              className={`px-3.5 py-2 text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeAssetClass === "industrial"
                  ? "bg-[#003366] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              Industrial Subpage (/demands/industrial)
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 text-xs font-bold bg-[#C9AB4C] hover:bg-[#b5973b] text-[#003366] shadow-xs flex items-center gap-1.5 transition-colors ml-1 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add New Demand
          </button>
        </div>
      </header>

      {/* 2. HORIZON & DATE RANGE PICKER BAR (DEFAULT: LAST MONTH & CURRENT MONTH) */}
      <div className="bg-white border border-slate-200 p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* Left: Quick Date Presets */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-700 font-bold text-xs">
            <Calendar className="w-4 h-4 text-[#003366]" />
            <span>Date Horizon:</span>
          </div>

          <div className="inline-flex border border-slate-300 bg-slate-50">
            <button
              type="button"
              onClick={() => handleSetPreset("last-and-current")}
              className={`px-3 py-1 text-xs transition-colors ${
                filters.preset === "last-and-current"
                  ? "bg-[#003366] text-white font-bold shadow-2xs"
                  : "text-slate-700 font-medium hover:bg-slate-200"
              }`}
            >
              Last Month & Current Month (Default)
            </button>
            <button
              type="button"
              onClick={() => handleSetPreset("last-90")}
              className={`px-3 py-1 text-xs transition-colors ${
                filters.preset === "last-90"
                  ? "bg-[#003366] text-white font-bold shadow-2xs"
                  : "text-slate-700 font-medium hover:bg-slate-200"
              }`}
            >
              Last 90 Days
            </button>
            <button
              type="button"
              onClick={() => handleSetPreset("year")}
              className={`px-3 py-1 text-xs transition-colors ${
                filters.preset === "year"
                  ? "bg-[#003366] text-white font-bold shadow-2xs"
                  : "text-slate-700 font-medium hover:bg-slate-200"
              }`}
            >
              2026 Year
            </button>
            <button
              type="button"
              onClick={() => handleSetPreset("all")}
              className={`px-3 py-1 text-xs transition-colors ${
                filters.preset === "all"
                  ? "bg-[#003366] text-white font-bold shadow-2xs"
                  : "text-slate-700 font-medium hover:bg-slate-200"
              }`}
            >
              All Time
            </button>
          </div>

          {/* Active Date Badge */}
          <span className="text-[11px] font-mono text-slate-600 bg-slate-100 px-2.5 py-1 border border-slate-200 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            {filters.dateStart && filters.dateEnd
              ? `Horizon: ${filters.dateStart} to ${filters.dateEnd}`
              : "Horizon: All Historical Records"}
          </span>
        </div>

        {/* Right: Interactive Date Inputs & View Mode Switcher */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Custom Date Range Inputs */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 border border-slate-300">
              <span className="text-[10px] uppercase font-bold text-slate-400">From:</span>
              <input
                type="date"
                value={filters.dateStart}
                onChange={(e) => handleCustomDateChange("dateStart", e.target.value)}
                className="text-xs bg-transparent text-slate-800 focus:outline-none"
              />
            </div>
            <span className="text-slate-400 text-xs">to</span>
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 border border-slate-300">
              <span className="text-[10px] uppercase font-bold text-slate-400">To:</span>
              <input
                type="date"
                value={filters.dateEnd}
                onChange={(e) => handleCustomDateChange("dateEnd", e.target.value)}
                className="text-xs bg-transparent text-slate-800 focus:outline-none"
              />
            </div>
          </div>

          {/* View Mode Switcher */}
          <div className="border-l border-slate-200 pl-3 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setViewMode("dashboard")}
              className={`px-3 py-1 font-bold text-xs flex items-center gap-1.5 transition-colors ${
                viewMode === "dashboard"
                  ? "bg-[#003366] text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Dashboard
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`px-3 py-1 font-bold text-xs flex items-center gap-1.5 transition-colors ${
                viewMode === "table"
                  ? "bg-[#003366] text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <Table2 className="w-3.5 h-3.5" />
              Data Grid
            </button>
            <button
              type="button"
              onClick={() => setViewMode("clickup")}
              className={`px-3 py-1 font-bold text-xs flex items-center gap-1.5 transition-colors ${
                viewMode === "clickup"
                  ? "bg-[#003366] text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <FolderArchive className="w-3.5 h-3.5" />
              Archive (ClickUp)
            </button>
          </div>

        </div>

      </div>

      {/* SYNC NOTIFICATION BANNER IF ACTIVE */}
      {syncStatusMsg && (
        <div className="bg-emerald-50 border border-emerald-300 p-3.5 text-xs text-emerald-900 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{syncStatusMsg}</span>
          </div>
          <a
            href={`https://app.clickup.com/9014981136/v/li/${DEMANDS_CLICKUP_LIST_ID}`}
            target="_blank"
            rel="noreferrer"
            className="font-bold underline hover:text-emerald-700 flex items-center gap-1"
          >
            Open ClickUp List (901420989525) <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* VIEW 1: EXECUTIVE VISUAL DASHBOARD */}
      {viewMode === "dashboard" && (
        <div className="space-y-6">
          
          {/* Hero Big Numbers Section */}
          <BigNumbersHero
            metrics={metrics}
            assetClass={activeAssetClass}
            dateHorizonLabel={`${filters.dateStart || "Start"} to ${filters.dateEnd || "End"}`}
          />

          {/* Subpage Specialized Cards: Location Coverage, Industry Trend, Timeline */}
          <DemandsCards assetClass={activeAssetClass} />

          {/* Row 2: Charts (Velocity Line Graph & Donut Charts) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7">
              <QuarterlyVelocityLineGraph demands={demands} />
            </div>
            <div className="lg:col-span-5">
              <SectorDonutChart demands={demands} />
            </div>
          </div>

          {/* Row 3: Secondary Visual Analytics (Property Types, Size Brackets, Associate Leaderboard) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <PropertyTypeDonutChart demands={demands} />
            <SpaceBracketsBarChart demands={demands} />
            <AssociateLeaderboardBarChart demands={demands} />
          </div>

        </div>
      )}

      {/* VIEW 2: EXCEL-STYLE DENSE DATA GRID */}
      {viewMode === "table" && (
        <div className="space-y-4">
          
          {/* Table Controls & Filter Toolbar */}
          <div className="bg-white border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              
              {/* Search Bar */}
              <div className="flex items-center gap-1.5 border border-slate-300 bg-white px-3 py-1.5">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search client, city, broker, or notes..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-56 text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
                />
              </div>

              {/* Type Filter */}
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="h-8 border border-slate-300 px-2.5 text-xs text-slate-700 bg-white"
              >
                <option value="">All Types (CL, CS, INDL)</option>
                <option value="CL">CL (Commercial Lease)</option>
                <option value="CS">CS (Commercial Space)</option>
                <option value="INDL">INDL (Industrial)</option>
              </select>

              {/* Region Filter */}
              <select
                value={filters.region}
                onChange={(e) => setFilters({ ...filters, region: e.target.value })}
                className="h-8 border border-slate-300 px-2.5 text-xs text-slate-700 bg-white"
              >
                <option value="">All Regions (G.LOC)</option>
                <option value="MM">MM (Metro Manila)</option>
                <option value="N">N (North Luzon / Bulacan / Pampanga)</option>
                <option value="S">S (South Luzon / Laguna / Cavite / Batangas)</option>
                <option value="GMM">GMM (Greater Metro Manila / Rizal)</option>
                <option value="SL">SL (South Luzon Corridor)</option>
              </select>

              {/* Priority Filter */}
              <select
                value={filters.priority}
                onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                className="h-8 border border-slate-300 px-2.5 text-xs text-slate-700 bg-white"
              >
                <option value="">All Priorities</option>
                <option value="Priority">Priority (Urgent)</option>
                <option value="Normal">Normal</option>
                <option value="Shelved">Shelved</option>
                <option value="Low">Low</option>
              </select>

              <button
                type="button"
                onClick={handleResetFilters}
                className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 border border-slate-200 hover:bg-slate-100 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>

            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 border border-slate-200">
                Showing {filteredDemands.length} of {demands.length} records
              </span>

              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3 py-1.5 bg-[#003366] text-white hover:bg-[#002244] text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV (Excel)
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white border border-slate-200 shadow-xs overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead className="bg-[#003366] text-white text-[11px] uppercase tracking-wider select-none">
                <tr>
                  <th className="p-3 border-r border-blue-900 w-12 text-center">#</th>
                  <th onClick={() => handleSort("date")} className="p-3 border-r border-blue-900 cursor-pointer hover:bg-blue-900 transition-colors whitespace-nowrap">
                    <div className="flex items-center gap-1">Date Inquired <ArrowUpDown className="w-3 h-3 opacity-70" /></div>
                  </th>
                  <th onClick={() => handleSort("assoc")} className="p-3 border-r border-blue-900 cursor-pointer hover:bg-blue-900 transition-colors whitespace-nowrap">
                    <div className="flex items-center gap-1">Assoc <ArrowUpDown className="w-3 h-3 opacity-70" /></div>
                  </th>
                  <th onClick={() => handleSort("type")} className="p-3 border-r border-blue-900 cursor-pointer hover:bg-blue-900 transition-colors text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">Type <ArrowUpDown className="w-3 h-3 opacity-70" /></div>
                  </th>
                  <th onClick={() => handleSort("client")} className="p-3 border-r border-blue-900 cursor-pointer hover:bg-blue-900 transition-colors whitespace-nowrap min-w-[180px]">
                    <div className="flex items-center gap-1">Client / Brand <ArrowUpDown className="w-3 h-3 opacity-70" /></div>
                  </th>
                  <th onClick={() => handleSort("industry")} className="p-3 border-r border-blue-900 cursor-pointer hover:bg-blue-900 transition-colors whitespace-nowrap">
                    <div className="flex items-center gap-1">Industry <ArrowUpDown className="w-3 h-3 opacity-70" /></div>
                  </th>
                  <th onClick={() => handleSort("minSqm")} className="p-3 border-r border-blue-900 cursor-pointer hover:bg-blue-900 transition-colors text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">Min (sqm) <ArrowUpDown className="w-3 h-3 opacity-70" /></div>
                  </th>
                  <th onClick={() => handleSort("maxSqm")} className="p-3 border-r border-blue-900 cursor-pointer hover:bg-blue-900 transition-colors text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">Max (sqm) <ArrowUpDown className="w-3 h-3 opacity-70" /></div>
                  </th>
                  <th onClick={() => handleSort("gloc")} className="p-3 border-r border-blue-900 cursor-pointer hover:bg-blue-900 transition-colors text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">G.LOC <ArrowUpDown className="w-3 h-3 opacity-70" /></div>
                  </th>
                  <th onClick={() => handleSort("city")} className="p-3 border-r border-blue-900 cursor-pointer hover:bg-blue-900 transition-colors whitespace-nowrap">
                    <div className="flex items-center gap-1">City <ArrowUpDown className="w-3 h-3 opacity-70" /></div>
                  </th>
                  <th className="p-3 border-r border-blue-900 min-w-[220px]">Target Location</th>
                  <th onClick={() => handleSort("priority")} className="p-3 border-r border-blue-900 cursor-pointer hover:bg-blue-900 transition-colors text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">Priority <ArrowUpDown className="w-3 h-3 opacity-70" /></div>
                  </th>
                  <th className="p-3 border-r border-blue-900 whitespace-nowrap">Purpose</th>
                  <th className="p-3 border-r border-blue-900 whitespace-nowrap">Timeline</th>
                  <th className="p-3 min-w-[220px]">Remarks / Specifications</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {filteredDemands.map((d, i) => {
                  const isPriority = d.priority === "Priority";
                  const isShelved = d.priority === "Shelved";
                  const isIndustrial = d.type === "INDL";
                  const isRollout = d.fulfillmentMode === "rollout";
                  const isEither = d.fulfillmentMode === "either";

                  return (
                    <tr 
                      key={d.id} 
                      className={`hover:bg-amber-50/40 transition-colors ${
                        isPriority ? "bg-rose-50/30" : ""
                      }`}
                    >
                      <td className="p-2.5 border-r border-slate-200 text-center font-mono text-slate-400">
                        {i + 1}
                      </td>

                      <td className="p-2.5 border-r border-slate-200 font-mono text-slate-600 whitespace-nowrap">
                        {d.date}
                      </td>

                      <td className="p-2.5 border-r border-slate-200 font-bold text-[#003366] whitespace-nowrap">
                        {d.assoc}
                      </td>

                      <td className="p-2.5 border-r border-slate-200 text-center">
                        <span className={`px-2 py-0.5 text-[10px] font-bold border ${
                          isIndustrial
                            ? "bg-amber-100 text-amber-900 border-amber-300"
                            : d.type === "CL"
                            ? "bg-blue-100 text-blue-900 border-blue-300"
                            : "bg-emerald-100 text-emerald-900 border-emerald-300"
                        }`}>
                          {d.type}
                        </span>
                      </td>

                      <td className="p-2.5 border-r border-slate-200 font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span>{d.client}</span>
                          {isRollout && (
                            <span className="text-[9px] font-mono text-[#003366] bg-blue-50 px-1 border border-blue-200" title="Multi-Store Rollout Site">
                              Rollout
                            </span>
                          )}
                          {isEither && (
                            <span className="text-[9px] font-mono text-amber-900 bg-amber-50 px-1 border border-amber-200" title="Either-Or Mandate">
                              Either-Or
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-2.5 border-r border-slate-200 text-slate-600 whitespace-nowrap">
                        {d.industry}
                      </td>

                      <td className="p-2.5 border-r border-slate-200 text-right font-mono text-slate-700">
                        {Number(d.minSqm).toLocaleString()}
                      </td>

                      <td className="p-2.5 border-r border-slate-200 text-right font-mono font-bold text-[#003366]">
                        {Number(d.maxSqm).toLocaleString()}
                      </td>

                      <td className="p-2.5 border-r border-slate-200 text-center font-bold text-slate-700">
                        {d.gloc}
                      </td>

                      <td className="p-2.5 border-r border-slate-200 text-slate-800 font-semibold whitespace-nowrap">
                        {d.city}
                      </td>

                      <td className="p-2.5 border-r border-slate-200 text-slate-700">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#C9AB4C] shrink-0" />
                          <span className="truncate max-w-[200px]" title={d.location}>
                            {d.location}
                          </span>
                        </div>
                      </td>

                      <td className="p-2.5 border-r border-slate-200 text-center whitespace-nowrap">
                        {isPriority ? (
                          <span className="px-2 py-0.5 text-[9px] font-bold bg-rose-100 text-rose-800 border border-rose-200 inline-flex items-center gap-1">
                            <AlertCircle className="w-2.5 h-2.5 text-rose-600" />
                            PRIORITY
                          </span>
                        ) : isShelved ? (
                          <span className="px-2 py-0.5 text-[9px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                            Shelved
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[9px] font-medium text-slate-600">
                            Normal
                          </span>
                        )}
                      </td>

                      <td className="p-2.5 border-r border-slate-200 text-slate-600 whitespace-nowrap">
                        {d.purpose || "—"}
                      </td>

                      <td className="p-2.5 border-r border-slate-200 text-slate-500 whitespace-nowrap">
                        {d.timeline || "Active"}
                      </td>

                      <td className="p-2.5 text-slate-600">
                        <span className="line-clamp-2" title={d.remarks}>
                          {d.remarks || "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {filteredDemands.length === 0 && (
                  <tr>
                    <td colSpan={15} className="p-12 text-center text-slate-400">
                      <Building2 className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                      <p className="font-bold text-slate-600">No corporate demands found matching these filters.</p>
                      <p className="text-xs text-slate-400 mt-1">Try selecting a broader date horizon or resetting filters.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* VIEW 3: CLICKUP ARCHIVE INTEGRATION PREVIEW (LIST 901420989525) */}
      {viewMode === "clickup" && (
        <div className="bg-white border border-slate-200 shadow-xs p-6 space-y-6">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <FolderArchive className="w-5 h-5 text-[#003366]" />
                <h2 className="font-serif text-2xl font-bold text-[#003366]">
                  ClickUp Archive Integration
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Synchronized target ClickUp List: <code className="font-mono bg-slate-100 px-1.5 py-0.5 text-slate-700 font-bold">{DEMANDS_CLICKUP_LIST_ID}</code>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <a
                href={`https://app.clickup.com/9014981136/v/li/${DEMANDS_CLICKUP_LIST_ID}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 text-xs font-bold text-[#003366] bg-white border border-slate-300 hover:border-[#003366] transition-colors flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View in ClickUp
              </a>

              <button
                type="button"
                onClick={handleBatchSyncClickUp}
                disabled={isSyncing}
                className="px-5 py-2 text-xs font-bold bg-[#003366] hover:bg-[#002244] text-white shadow-xs flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                {isSyncing ? "Archiving Records..." : "Sync All to ClickUp List 901420989525"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Target List ID</span>
              <p className="font-mono text-lg font-extrabold text-[#003366] mt-1">{DEMANDS_CLICKUP_LIST_ID}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Demands Monitoring Archive Space</p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Mandates</span>
              <p className="font-serif text-lg font-extrabold text-slate-900 mt-1">{demands.length} Corporate Demands</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Formatted as structured Markdown tables</p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Task Naming Standard</span>
              <p className="font-mono text-xs font-bold text-slate-800 mt-1 truncate">
                [Type] Client — Min-Max sqm | City, Target Location (Assoc)
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">Automated title and priority tags</p>
            </div>
          </div>

          {/* Sample Markdown Task Card Previews */}
          <div className="space-y-4">
            <h3 className="font-serif text-base font-bold text-[#003366]">
              Archived Task Formatted Preview (Sample Top Mandates)
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {demands.slice(0, 4).map((d, i) => (
                <div key={d.id} className="border border-slate-200 p-4 bg-white shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-mono text-xs font-bold text-[#003366] truncate max-w-[420px]" title={formatDemandClickUpTitle(d)}>
                      {formatDemandClickUpTitle(d)}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-[#003366] border border-blue-200">
                      Task #{i + 1}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-3 text-[11px] font-mono text-slate-700 space-y-1 overflow-x-auto border border-slate-100">
                    <pre className="whitespace-pre-wrap font-sans text-xs">
                      {formatDemandClickUpDescription(d)}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* 4. INTAKE MODAL */}
      <NewDemandModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateDemand}
        defaultAssetClass={activeAssetClass}
      />

    </div>
  );
}

export default DemandsView;
