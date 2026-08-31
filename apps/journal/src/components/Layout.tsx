import { Link, useLocation } from "wouter";
import { LayoutDashboard, PlusSquare, BookOpen, Eye, BarChart2, Settings } from "lucide-react";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/new-trade", label: "New Trade", icon: PlusSquare },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/watchlist", label: "Watchlist", icon: Eye },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <aside className="w-48 shrink-0 flex flex-col border-r border-border">
        <div className="px-5 py-5 border-b border-border">
          <div className="font-mono text-xs font-semibold tracking-widest text-foreground uppercase">
            TradeOS
          </div>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-px">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = location === href;
            return (
              <Link key={href} href={href}>
                <div
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-sm text-sm cursor-pointer transition-colors ${
                    active
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  }`}
                >
                  <Icon size={14} strokeWidth={active ? 2 : 1.5} className="shrink-0" />
                  <span>{label}</span>
                </div>
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 w-full overflow-hidden">
        <div className="flex-1 overflow-y-auto min-w-0">{children}</div>
      </main>
    </div>
  );
}
