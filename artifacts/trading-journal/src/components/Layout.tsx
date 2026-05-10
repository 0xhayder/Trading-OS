import { Link, useLocation } from "wouter";
import { LayoutDashboard, PlusSquare, BookOpen, Eye, BarChart2, Settings } from "lucide-react";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/trade-entry", label: "New Trade", icon: PlusSquare },
  { href: "/trade-history", label: "Journal", icon: BookOpen },
  { href: "/watchlist", label: "Watchlist", icon: Eye },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <aside className="w-52 shrink-0 flex flex-col border-r border-sidebar-border bg-sidebar">
        <div className="px-5 py-5 border-b border-sidebar-border">
          <div className="text-xs font-mono font-semibold tracking-widest text-muted-foreground uppercase">
            TradeOS
          </div>
          <div className="text-[10px] text-muted-foreground/50 mt-0.5 tracking-wider font-mono">
            v1.0
          </div>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = location === href;
            return (
              <Link key={href} href={href}>
                <div
                  className={`flex items-center gap-3 px-3 py-2 rounded-sm text-sm cursor-pointer transition-colors ${
                    active
                      ? "bg-sidebar-accent text-sidebar-foreground font-medium"
                      : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                  }`}
                >
                  <Icon size={14} strokeWidth={active ? 2 : 1.5} />
                  <span>{label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="px-5 py-4 border-t border-sidebar-border">
          <div className="text-[10px] text-muted-foreground/40 font-mono">
            SYSTEM ACTIVE
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
