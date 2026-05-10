import { useState, useEffect } from "react";
import type { Trade, WatchlistTrade, Settings } from "./types";

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function persist<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function useTrades() {
  const [trades, setTrades] = useState<Trade[]>(() => load("tj_trades", []));

  useEffect(() => { persist("tj_trades", trades); }, [trades]);

  const addTrade = (trade: Trade) => setTrades((p) => [trade, ...p]);
  const updateTrade = (id: string, patch: Partial<Trade>) =>
    setTrades((p) => p.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const deleteTrade = (id: string) => setTrades((p) => p.filter((t) => t.id !== id));

  return { trades, addTrade, updateTrade, deleteTrade };
}

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<WatchlistTrade[]>(() =>
    load("tj_watchlist", [])
  );

  useEffect(() => { persist("tj_watchlist", watchlist); }, [watchlist]);

  const addToWatchlist = (item: WatchlistTrade) => setWatchlist((p) => [item, ...p]);
  const updateWatchlist = (id: string, patch: Partial<WatchlistTrade>) =>
    setWatchlist((p) => p.map((w) => (w.id === id ? { ...w, ...patch } : w)));
  const deleteFromWatchlist = (id: string) =>
    setWatchlist((p) => p.filter((w) => w.id !== id));

  return { watchlist, addToWatchlist, updateWatchlist, deleteFromWatchlist };
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() =>
    load("tj_settings", { totalCapital: 10000 })
  );

  const updateSettings = (patch: Partial<Settings>) =>
    setSettings((p) => {
      const next = { ...p, ...patch };
      persist("tj_settings", next);
      return next;
    });

  return { settings, updateSettings };
}
