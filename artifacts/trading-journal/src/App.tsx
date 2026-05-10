import { Switch, Route, Router as WouterRouter } from "wouter";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import TradeEntry from "@/pages/TradeEntry";
import Journal from "@/pages/Journal";
import Watchlist from "@/pages/Watchlist";
import Analytics from "@/pages/Analytics";
import Settings from "@/pages/Settings";

function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
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
