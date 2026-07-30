import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Menu, RefreshCw, Search, Wifi, WifiOff } from "lucide-react";
import { useHealth } from "@/hooks/useHealth";
import { cn } from "@/utils/cn";

const ROUTE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/alerts": "Alert Queue",
  "/incidents": "Incidents",
  "/threat-intelligence": "Threat Intelligence",
  "/playbooks": "Playbooks",
  "/analytics": "Analytics",
  "/activity": "Activity",
  "/settings": "Settings",
};

function resolveTitle(pathname: string): string {
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname];
  if (pathname.startsWith("/alerts/")) return "Alert Investigation";
  return "SOAR Command Center";
}

export function Header({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: health, isError, isFetching } = useHealth();
  const [now, setNow] = useState(() => new Date());
  const [search, setSearch] = useState("");
  const isOnline = !isError && health?.status === "healthy";

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = search.trim();
    navigate(trimmed ? `/alerts?search=${encodeURIComponent(trimmed)}` : "/alerts");
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-[var(--color-line)] bg-[var(--color-base)]/95 px-4 backdrop-blur sm:px-6">
      <button
        onClick={onOpenMobileNav}
        className="rounded-md p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] lg:hidden"
        aria-label="Open navigation"
      >
        <Menu size={19} />
      </button>

      <h1 className="shrink-0 text-sm font-semibold text-[var(--color-text)] sm:text-base">
        {resolveTitle(location.pathname)}
      </h1>

      <form onSubmit={handleSearchSubmit} className="ml-2 hidden max-w-sm flex-1 md:block">
        <div className="relative">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-faint)]"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            type="search"
            placeholder="Search alerts by title or description…"
            className="w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] py-1.5 pl-9 pr-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:border-[var(--color-accent)] focus:outline-none"
          />
        </div>
      </form>

      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
        <div
          className={cn(
            "hidden items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium sm:flex",
            isOnline
              ? "border-[var(--color-healthy)]/30 bg-[var(--color-healthy-soft)] text-[var(--color-healthy)]"
              : "border-[var(--color-critical)]/30 bg-[var(--color-critical-soft)] text-[var(--color-critical)]",
          )}
        >
          {isOnline ? <Wifi size={13} /> : <WifiOff size={13} />}
          {isOnline ? "Online" : "Offline"}
        </div>

        <time className="hidden font-mono text-xs tabular text-[var(--color-text-muted)] md:block" dateTime={now.toISOString()}>
          {now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </time>

        <button
          onClick={() => queryClient.invalidateQueries()}
          className="inline-flex items-center gap-1.5 rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
          aria-label="Refresh data"
        >
          <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>
    </header>
  );
}
