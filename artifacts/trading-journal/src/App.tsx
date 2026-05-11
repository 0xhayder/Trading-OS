import { Switch, Route, Router as WouterRouter } from "wouter";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import TradeEntry from "@/pages/TradeEntry";
import Journal from "@/pages/Journal";
import Watchlist from "@/pages/Watchlist";
import Analytics from "@/pages/Analytics";
import Settings from "@/pages/Settings";

function wouterBasePath(): string {
  try {
    const base = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL;
    if (typeof base === "string") return base.replace(/\/$/, "");
  } catch {
    /* non-Vite bundlers */
  }
  if (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_BASE_PATH != null) {
    return String(process.env.NEXT_PUBLIC_BASE_PATH).replace(/\/$/, "");
  }
  return "";
}

function App() {
  return (
    <WouterRouter base={wouterBasePath()}>
      <Layout>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/new-trade" component={TradeEntry} />
          <Route path="/journal" component={Journal} />
          <Route path="/watchlist" component={Watchlist} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/settings" component={Settings} />
        </Switch>
      </Layout>
    </WouterRouter>
  );
}

export default App;
