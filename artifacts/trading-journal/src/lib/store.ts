import { useState, useEffect } from "react";
import type { Trade, WatchlistItem, Settings } from "./types";

const TRADES_KEY = "tj_trades";
const WATCHLIST_KEY = "tj_watchlist";
const SETTINGS_KEY = "tj_settings";

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function useTrades() {
  const [trades, setTrades] = useState<Trade[]>(() => load(TRADES_KEY, SEED_TRADES));

  useEffect(() => {
    save(TRADES_KEY, trades);
  }, [trades]);

  const addTrade = (trade: Trade) => setTrades((p) => [trade, ...p]);
  const updateTrade = (id: string, updates: Partial<Trade>) =>
    setTrades((p) => p.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  const deleteTrade = (id: string) => setTrades((p) => p.filter((t) => t.id !== id));

  return { trades, addTrade, updateTrade, deleteTrade };
}

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(() =>
    load(WATCHLIST_KEY, SEED_WATCHLIST)
  );

  useEffect(() => {
    save(WATCHLIST_KEY, watchlist);
  }, [watchlist]);

  const addItem = (item: WatchlistItem) => setWatchlist((p) => [item, ...p]);
  const updateItem = (id: string, updates: Partial<WatchlistItem>) =>
    setWatchlist((p) => p.map((w) => (w.id === id ? { ...w, ...updates } : w)));
  const deleteItem = (id: string) => setWatchlist((p) => p.filter((w) => w.id !== id));

  return { watchlist, addItem, updateItem, deleteItem };
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() =>
    load(SETTINGS_KEY, {
      totalCapital: 10000,
      riskProfilePct: 1.5,
      defaultRiskPct: 1,
      maxAllocationPct: 5,
    })
  );

  const updateSettings = (updates: Partial<Settings>) => {
    setSettings((p) => {
      const next = { ...p, ...updates };
      save(SETTINGS_KEY, next);
      return next;
    });
  };

  return { settings, updateSettings };
}

const SEED_TRADES: Trade[] = [
  {
    id: "seed-1",
    coin: "BTC/USDT",
    setupType: "Breakout Retest",
    timeframe: "Daily",
    btcCondition: "Bullish",
    altCondition: "Bullish",
    narrativeStrength: "Hot",
    levelClarity: "Obvious",
    timeframeAlignment: "Fully Aligned",
    retestQuality: "Strong",
    volumeStrength: "Strong Expansion",
    candleImpulse: "Strong",
    followThrough: "Continuation Present",
    stopLossPct: 3,
    tp1Pct: 6,
    tp2Pct: 12,
    entryDistance: "Optimal",
    spaceToResistance: "Large Space",
    rrQuality: "Asymmetric",
    overextension: "Calm",
    eventRisk: "Low",
    liquidityRisk: "High Liquidity",
    notes: "Clean breakout retest on daily with strong volume",
    mode: "trade",
    finalScore: 93,
    tradeStatus: "Expansion Trade",
    suggestedAllocationPct: 5,
    suggestedSlPct: 3,
    suggestedTpStructure: "TP1 +6% / TP2 +12% — 60% at TP1, let 40% run",
    suggestedRr: 3,
    tradeWarnings: [],
    calculatedRisk: 0.15,
    expectedProfitPct: 0.6,
    expectedLossPct: 0.15,
    finalDecision: "APPROVED — EXPANSION",
    status: "closed",
    outcome: "win",
    actualPnlPct: 9.2,
    createdAt: "2026-04-10T08:00:00Z",
  },
  {
    id: "seed-2",
    coin: "ETH/USDT",
    setupType: "Double Bottom",
    timeframe: "4H",
    btcCondition: "Neutral",
    altCondition: "Neutral",
    narrativeStrength: "Active",
    levelClarity: "Decent",
    timeframeAlignment: "Partially Aligned",
    retestQuality: "Acceptable",
    volumeStrength: "Normal",
    candleImpulse: "Medium",
    followThrough: "Slowing",
    stopLossPct: 4,
    tp1Pct: 7,
    tp2Pct: 14,
    entryDistance: "Acceptable",
    spaceToResistance: "Decent Space",
    rrQuality: "Acceptable",
    overextension: "Calm",
    eventRisk: "Medium",
    liquidityRisk: "Acceptable",
    notes: "Double bottom on 4H, ETH looking weak relative to BTC",
    mode: "trade",
    finalScore: 57,
    tradeStatus: "Standard Trade",
    suggestedAllocationPct: 1,
    suggestedSlPct: 4,
    suggestedTpStructure: "TP1 +7% / TP2 +14% — 60% at TP1, let 40% run",
    suggestedRr: 2.6,
    tradeWarnings: [],
    calculatedRisk: 0.04,
    expectedProfitPct: 0.14,
    expectedLossPct: 0.04,
    finalDecision: "APPROVED — STANDARD",
    status: "closed",
    outcome: "loss",
    actualPnlPct: -3.8,
    createdAt: "2026-04-18T14:00:00Z",
  },
  {
    id: "seed-3",
    coin: "TAO/USDT",
    setupType: "Trendline Trade",
    timeframe: "Weekly",
    btcCondition: "Bullish",
    altCondition: "Bullish",
    narrativeStrength: "Hot",
    levelClarity: "Obvious",
    timeframeAlignment: "Fully Aligned",
    retestQuality: "Strong",
    volumeStrength: "Strong Expansion",
    candleImpulse: "Strong",
    followThrough: "Continuation Present",
    stopLossPct: 5,
    tp1Pct: 12,
    tp2Pct: 25,
    entryDistance: "Optimal",
    spaceToResistance: "Large Space",
    rrQuality: "Asymmetric",
    overextension: "Calm",
    eventRisk: "Low",
    liquidityRisk: "High Liquidity",
    notes: "Weekly trendline tap with AI narrative heat",
    mode: "trade",
    finalScore: 90,
    tradeStatus: "Expansion Trade",
    suggestedAllocationPct: 5,
    suggestedSlPct: 5,
    suggestedTpStructure: "TP1 +12% / TP2 +25% — 60% at TP1, let 40% run",
    suggestedRr: 3.7,
    tradeWarnings: [],
    calculatedRisk: 0.25,
    expectedProfitPct: 1.25,
    expectedLossPct: 0.25,
    finalDecision: "APPROVED — EXPANSION",
    status: "open",
    createdAt: "2026-05-01T09:00:00Z",
  },
  {
    id: "seed-4",
    coin: "SOL/USDT",
    setupType: "Breakout Retest",
    timeframe: "Daily",
    btcCondition: "Bullish",
    altCondition: "Bullish",
    narrativeStrength: "Active",
    levelClarity: "Decent",
    timeframeAlignment: "Fully Aligned",
    retestQuality: "Strong",
    volumeStrength: "Normal",
    candleImpulse: "Strong",
    followThrough: "Continuation Present",
    stopLossPct: 3.5,
    tp1Pct: 8,
    tp2Pct: 16,
    entryDistance: "Optimal",
    spaceToResistance: "Large Space",
    rrQuality: "Asymmetric",
    overextension: "Calm",
    eventRisk: "Low",
    liquidityRisk: "High Liquidity",
    notes: "",
    mode: "trade",
    finalScore: 78,
    tradeStatus: "High Conviction",
    suggestedAllocationPct: 2.5,
    suggestedSlPct: 3.5,
    suggestedTpStructure: "TP1 +8% / TP2 +16% — 60% at TP1, let 40% run",
    suggestedRr: 3.4,
    tradeWarnings: [],
    calculatedRisk: 0.09,
    expectedProfitPct: 0.4,
    expectedLossPct: 0.09,
    finalDecision: "APPROVED — HIGH CONVICTION",
    status: "closed",
    outcome: "win",
    actualPnlPct: 11.4,
    createdAt: "2026-04-25T10:30:00Z",
  },
  {
    id: "seed-5",
    coin: "AVAX/USDT",
    setupType: "Double Bottom",
    timeframe: "4H",
    btcCondition: "Bearish",
    altCondition: "Bearish",
    narrativeStrength: "Dead",
    levelClarity: "Forced / Messy",
    timeframeAlignment: "Counter Trend",
    retestQuality: "Weak",
    volumeStrength: "Weak",
    candleImpulse: "Weak",
    followThrough: "Failing",
    stopLossPct: 6,
    tp1Pct: 5,
    tp2Pct: 9,
    entryDistance: "Extended",
    spaceToResistance: "Limited Space",
    rrQuality: "Poor",
    overextension: "Euphoric",
    eventRisk: "High",
    liquidityRisk: "Dangerous",
    notes: "Should not have taken this",
    mode: "trade",
    finalScore: 3,
    tradeStatus: "Reject",
    suggestedAllocationPct: 0,
    suggestedSlPct: 6,
    suggestedTpStructure: "Set TP levels to generate structure",
    suggestedRr: 1.2,
    tradeWarnings: ["Price euphoric — high reversal risk", "High event risk — reduce size or avoid", "BTC bearish — alts likely to underperform", "Counter-trend — lower probability", "Poor RR quality — consider skipping", "Follow-through failing — momentum exhausted"],
    calculatedRisk: 0,
    expectedProfitPct: 0,
    expectedLossPct: 0,
    finalDecision: "REJECTED",
    status: "closed",
    outcome: "loss",
    actualPnlPct: -5.2,
    mistakeTags: "FOMO, Ignored System",
    createdAt: "2026-04-05T11:00:00Z",
  },
];

const SEED_WATCHLIST: WatchlistItem[] = [
  {
    id: "w-1",
    coin: "INJ/USDT",
    setupType: "Breakout Retest",
    timeframe: "Daily",
    notes: "Waiting for retest of breakout zone. Not ready yet — needs another daily close.",
    createdAt: "2026-05-05T12:00:00Z",
  },
  {
    id: "w-2",
    coin: "TIA/USDT",
    setupType: "Trendline Trade",
    timeframe: "Weekly",
    notes: "Modular narrative cooling. Watching for re-entry on weekly trendline.",
    createdAt: "2026-05-07T09:00:00Z",
  },
];
