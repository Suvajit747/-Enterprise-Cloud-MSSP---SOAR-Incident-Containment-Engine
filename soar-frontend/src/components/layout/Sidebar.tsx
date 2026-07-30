import { NavLink } from "react-router-dom";
import {
  ShieldHalf,
  LayoutDashboard,
  Siren,
  FolderKanban,
  Radar,
  Workflow,
  BarChart3,
  Activity,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { useHealth, useVersion } from "@/hooks/useHealth";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/alerts", label: "Alerts", icon: Siren },
  { to: "/incidents", label: "Incidents", icon: FolderKanban },
  { to: "/threat-intelligence", label: "Threat Intelligence", icon: Radar },
  { to: "/playbooks", label: "Playbooks", icon: Workflow },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/activity", label: "Activity", icon: Activity },
  { to: "/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ collapsed, onToggle, mobileOpen, onCloseMobile }: SidebarProps) {
  const { data: health, isError: healthError } = useHealth();
  const { data: version } = useVersion();
  const isOnline = !healthError && health?.status === "healthy";

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-[var(--color-line)] bg-[var(--color-base-raised)] transition-all duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          collapsed ? "lg:w-[72px]" : "lg:w-64",
          "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
        aria-label="Primary navigation"
      >
        <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-[var(--color-line)] px-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--color-accent-soft)]">
            <ShieldHalf size={18} className="text-[var(--color-accent)]" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight text-[var(--color-text)]">
                SOAR Command Center
              </p>
              <p className="truncate text-[11px] leading-tight text-[var(--color-text-faint)]">
                Incident Containment Engine
              </p>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={onCloseMobile}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      collapsed && "lg:justify-center lg:px-2",
                      isActive
                        ? "bg-[var(--color-accent-soft)] text-[var(--color-accent-strong)]"
                        : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]",
                    )
                  }
                >
                  <item.icon size={17} className="shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="shrink-0 border-t border-[var(--color-line)] p-3">
          <div
            className={cn(
              "flex items-center gap-2 rounded-md bg-[var(--color-surface)] px-3 py-2.5",
              collapsed && "lg:justify-center lg:px-2",
            )}
          >
            <span
              className={cn(
                "h-2 w-2 shrink-0 rounded-full",
                isOnline ? "bg-[var(--color-healthy)] status-pulse" : "bg-[var(--color-critical)]",
              )}
              aria-hidden="true"
            />
            {!collapsed && (
              <div className="min-w-0 text-xs">
                <p className="font-medium text-[var(--color-text)]">
                  {isOnline ? "Backend Online" : "Backend Offline"}
                </p>
                <p className="truncate text-[var(--color-text-faint)] tabular">
                  {version ? `v${version.version}` : "version unknown"}
                </p>
              </div>
            )}
          </div>
          <button
            onClick={onToggle}
            className="mt-2 hidden w-full items-center justify-center gap-2 rounded-md py-2 text-xs text-[var(--color-text-faint)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-muted)] lg:flex"
          >
            {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
            {!collapsed && "Collapse"}
          </button>
        </div>
      </aside>
    </>
  );
}
