import { Link, useLocation } from "wouter";
import { 
  Activity, 
  BarChart2, 
  BookOpen, 
  List, 
  Settings as SettingsIcon, 
  TerminalSquare 
} from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Dashboard", icon: TerminalSquare },
    { href: "/trade-entry", label: "Trade Entry", icon: Activity },
    { href: "/trade-history", label: "Journal", icon: BookOpen },
    { href: "/watchlist", label: "Watchlist", icon: List },
    { href: "/analytics", label: "Analytics", icon: BarChart2 },
    { href: "/settings", label: "Settings", icon: SettingsIcon },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground selection:bg-white selection:text-black">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col">
        <div className="p-6 border-b border-border">
          <h1 className="font-mono text-sm tracking-widest font-bold uppercase">
            Quant_Terminal //
          </h1>
        </div>
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center gap-3 px-4 py-2 text-sm font-mono cursor-pointer border border-transparent transition-colors ${
                    isActive
                      ? "bg-secondary text-white border-border"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-white"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border text-xs font-mono text-muted-foreground">
          SYS_STATE: ONLINE
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-background p-8">
        <div className="max-w-7xl mx-auto h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
