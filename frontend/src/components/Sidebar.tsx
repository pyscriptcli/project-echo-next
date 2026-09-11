"use client";

import React from "react";
import { 
  LayoutDashboard, 
  FolderArchive, 
  FileEdit, 
  ChevronLeft, 
  ChevronRight, 
  LogOut,
  CheckSquare,
  ClipboardList,
  Settings,
  NotebookTabs,
  Newspaper
} from "lucide-react";

export type NavView = "dashboard" | "tasks" | "notebook" | "market-insights" | "meetings" | "minutes" | "forms" | "forms-admin";

interface SidebarProps {
  currentView: NavView;
  onSelectView: (view: NavView) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  user?: {
    id?: number | string;
    username?: string;
    email?: string;
    color?: string;
    profilePicture?: string | null;
    initials?: string;
    workspaceName?: string;
  } | null;
  onSignOut?: () => void;
  allowedPages?: NavView[];
  isAdmin?: boolean;
}

export function Sidebar({
  currentView,
  onSelectView,
  isCollapsed: externalCollapsed,
  onToggleCollapse,
  user,
  onSignOut,
  allowedPages,
  isAdmin
}: SidebarProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [isPinned, setIsPinned] = React.useState(false);
  const hoverTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 150);
  };

  // Auto-collapsed when pointer is not hovering; auto-expanded when hovering
  const effectiveCollapsed = isPinned ? false : !isHovered;

  const isOwner = user?.email?.toLowerCase() === "admin@primephilippines.com";
  const isProjectAdmin = isOwner || Boolean(isAdmin);

  // Primary workspace navigation order
  const allNavItems = [
    {
      id: "dashboard" as NavView,
      label: "Dashboard",
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: "tasks" as NavView,
      label: "Tasks",
      icon: CheckSquare,
      badge: null
    },
    {
      id: "notebook" as NavView,
      label: "Notebook",
      icon: NotebookTabs,
      badge: null
    },
    {
      id: "market-insights" as NavView,
      label: "Market Insights",
      icon: Newspaper,
      badge: null
    },
    {
      id: "meetings" as NavView,
      label: "Meetings",
      icon: FolderArchive,
      badge: null
    },
    {
      id: "minutes" as NavView,
      label: "Notetaker",
      icon: FileEdit,
      badge: null
    },
    {
      id: "forms" as NavView,
      label: "Forms",
      icon: ClipboardList,
      badge: null
    }
  ];

  const navItems = allNavItems.filter((item) => {
    if (isProjectAdmin) return true;
    if (!allowedPages || allowedPages.length === 0) return true;
    return allowedPages.includes(item.id);
  });

  return (
    <div
      className={`relative h-full z-40 shrink-0 transition-all duration-300 ease-in-out ${
        isPinned ? "w-64 min-w-[256px]" : "w-18 min-w-[72px]"
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <aside 
        className={`absolute top-0 left-0 h-full flex flex-col justify-between bg-[#1b1d1e] text-[#E0E0E0] border-r-2 border-[#C9AB4C] shadow-[4px_0_24px_rgba(0,0,0,0.5),2px_0_12px_rgba(201,171,76,0.25)] transition-all duration-300 ease-in-out z-40 select-none overflow-hidden ${
          effectiveCollapsed ? "w-18 min-w-[72px]" : "w-64 min-w-[256px]"
        }`}
      >
        {/* Top Header & Branding (Text-only Echo, no subheadings/no prime) */}
        <div>
          <div className={`h-16 flex items-center border-b border-[#2c2f32] ${effectiveCollapsed ? "justify-center px-2" : "justify-between px-4"}`}>
            {!effectiveCollapsed && (
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="font-serif italic text-2xl font-normal tracking-wide text-[#FAF9F7]">
                  Echo
                </span>
                <span className="w-1.5 h-1.5 bg-[#C9AB4C] mt-1"></span>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setIsPinned(!isPinned);
                if (onToggleCollapse) onToggleCollapse();
              }}
              aria-label={isPinned ? "Unpin sidebar (auto-collapse)" : "Pin sidebar expanded"}
              title={isPinned ? "Unpin sidebar (auto-collapse on leave)" : "Pin sidebar expanded"}
              className="p-1.5 rounded-none hover:bg-[#25282a] text-gray-400 hover:text-[#C9AB4C] transition-colors cursor-pointer"
            >
              {effectiveCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>

          {/* Navigation Items (Dashboard, Meetings, Notetaker) */}
          <nav className="p-3 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectView(item.id)}
                  title={effectiveCollapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-none text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#25282a] text-[#C9AB4C] border-l-2 border-[#C9AB4C] shadow-inner"
                      : "text-gray-400 hover:bg-[#25282a] hover:text-white"
                  } ${effectiveCollapsed ? "justify-center px-0" : ""}`}
                >
                  <Icon size={18} className={`shrink-0 ${isActive ? "text-[#C9AB4C]" : "text-gray-400"}`} />
                  {!effectiveCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Workspace & User Profile Section (#1b1d1e) */}
        <div className="border-t border-[#2c2f32] bg-[#161819]">
          {isProjectAdmin && <button type="button" onClick={() => onSelectView("forms-admin")} title="Settings" className={`w-full flex items-center gap-3 px-4 py-2.5 border-b border-[#2c2f32] text-xs font-semibold transition-colors ${currentView === "forms-admin" ? "text-[#C9AB4C] bg-[#25282a]" : "text-gray-400 hover:text-white hover:bg-[#25282a]"} ${effectiveCollapsed ? "justify-center px-0" : ""}`}><Settings size={17} />{!effectiveCollapsed && <span>Settings</span>}</button>}
          {/* Workspace Name Header */}
          {!effectiveCollapsed ? (
            <div className="px-3.5 pt-2.5 pb-2 border-b border-[#2c2f32]/80 flex items-center justify-between overflow-hidden">
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="w-1.5 h-1.5 bg-[#C9AB4C] shrink-0"></span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#C9AB4C] truncate">
                  {user?.workspaceName || "Primephilippines"}
                </span>
              </div>
              <span className="text-[9px] uppercase tracking-widest text-gray-500 font-semibold shrink-0">
                Workspace
              </span>
            </div>
          ) : (
            <div className="py-2 flex justify-center border-b border-[#2c2f32]/80">
              <div 
                title={user?.workspaceName || "Primephilippines"}
                className="w-5 h-5 rounded-none bg-[#25282a] border border-[#C9AB4C]/50 flex items-center justify-center text-[10px] font-bold text-[#C9AB4C]"
              >
                {(user?.workspaceName || "P")[0].toUpperCase()}
              </div>
            </div>
          )}

          {/* User Account Details */}
          <div className="p-3">
            {!effectiveCollapsed ? (
              <div className="flex items-center justify-between whitespace-nowrap overflow-hidden">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  {user?.profilePicture ? (
                    <img
                      src={user.profilePicture}
                      alt={user.username || "User"}
                      className="w-8 h-8 rounded-none border border-[#C9AB4C]/60 object-cover shrink-0"
                    />
                  ) : (
                    <div
                      style={user?.color ? { borderColor: user.color } : undefined}
                      className="w-8 h-8 rounded-none bg-[#25282a] border border-[#C9AB4C]/60 flex items-center justify-center text-xs font-bold text-[#C9AB4C] shrink-0"
                    >
                      {user?.initials || "CU"}
                    </div>
                  )}
                  <div className="truncate">
                    <div className="text-xs font-semibold text-white truncate">
                      {user?.username || "ClickUp User"}
                    </div>
                    <div className="text-[10px] text-gray-400 truncate">
                      {user?.email || "ClickUp Portal"}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  title="Sign out from ClickUp"
                  onClick={onSignOut}
                  className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-[#25282a] rounded-none transition-colors cursor-pointer shrink-0"
                >
                  <LogOut size={15} />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-1">
                {user?.profilePicture ? (
                  <img
                    src={user.profilePicture}
                    alt={user.username || "User"}
                    title={user.username || "User"}
                    className="w-8 h-8 rounded-none border border-[#C9AB4C]/60 object-cover shrink-0"
                  />
                ) : (
                  <div 
                    title={user?.username || "ClickUp User"}
                    style={user?.color ? { borderColor: user.color } : undefined}
                    className="w-8 h-8 rounded-none bg-[#25282a] border border-[#C9AB4C]/60 flex items-center justify-center text-xs font-bold text-[#C9AB4C]"
                  >
                    {user?.initials || "CU"}
                  </div>
                )}
                <button
                  type="button"
                  title="Sign out from ClickUp"
                  onClick={onSignOut}
                  className="p-1 text-gray-500 hover:text-red-400 transition-colors rounded-none cursor-pointer"
                >
                  <LogOut size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
