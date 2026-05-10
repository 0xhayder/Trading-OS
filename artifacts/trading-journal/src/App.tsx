import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import TradeEntry from "@/pages/TradeEntry";
import TradeHistory from "@/pages/TradeHistory";
import Watchlist from "@/pages/Watchlist";
import Analytics from "@/pages/Analytics";
import Settings from "@/pages/Settings";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/trade-entry" component={TradeEntry} />
        <Route path="/trade-history" component={TradeHistory} />
        <Route path="/watchlist" component={Watchlist} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/settings" component={Settings} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
