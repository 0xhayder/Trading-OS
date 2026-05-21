import { useEffect, useRef, useState } from "react";
import type { CapitalAdjustment, Settings, Trade, WatchlistTrade } from "./types";
import {
  createCapitalAdjustmentInSupabase,
  createTradeInSupabase,
  createWatchlistInSupabase,
  deleteCapitalAdjustmentFromSupabase,
  deleteTradeFromSupabase,
  deleteWatchlistFromSupabase,
  fetchCapitalAdjustmentsFromSupabase,
  fetchSettingsFromSupabase,
  fetchTradesFromSupabase,
  fetchWatchlistFromSupabase,
  updateSettingsInSupabase,
  updateTradeInSupabase,
  updateWatchlistInSupabase,
} from "./supabaseStore";

function load<T>(key: string, fallback: T): T {
  if (typeof localStorage === "undefined") return fallback;

  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function persist<T>(key: string, value: T): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

function replaceById<T extends { id: string }>(items: T[], item: T) {
  return items.map((existing) => (existing.id === item.id ? item : existing));
}

const settingsSubscribers = new Set<(settings: Settings) => void>();

/** Refresh net equity from API and notify all `useSettings` subscribers. */
export function pullSettingsFromRemote(): Promise<void> {
  return fetchSettingsFromSupabase().then((remoteSettings) => {
    if (remoteSettings == null) return;
    persist("tj_settings", remoteSettings);
    settingsSubscribers.forEach((notify) => notify(remoteSettings));
  });
}

export function useTrades() {
  const [trades, setTrades] = useState<Trade[]>(() => load("tj_trades", []));
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    void fetchTradesFromSupabase().then((remoteTrades) => {
      if (!mounted.current || remoteTrades == null) return;
      setTrades(remoteTrades);
      persist("tj_trades", remoteTrades);
    });

    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    persist("tj_trades", trades);
  }, [trades]);

  const addTrade = async (trade: Trade) => {
    setTrades((previous) => [trade, ...previous]);

    const remoteTrade = await createTradeInSupabase(trade);
    if (!remoteTrade || !mounted.current) return;

    setTrades((previous) => [remoteTrade, ...previous.filter((item) => item.id !== trade.id)]);
  };

  const updateTrade = (id: string, patch: Partial<Trade>): Promise<Trade | null> => {
    setTrades((previous) => previous.map((trade) => (trade.id === id ? { ...trade, ...patch } : trade)));

    return updateTradeInSupabase(id, patch).then((remoteTrade) => {
      if (!remoteTrade || !mounted.current) return null;
      setTrades((previous) => replaceById(previous, remoteTrade));
      void pullSettingsFromRemote();
      return remoteTrade;
    });
  };

  const deleteTrade = (id: string) => {
    setTrades((previous) => previous.filter((trade) => trade.id !== id));
    void deleteTradeFromSupabase(id);
  };

  return { trades, addTrade, updateTrade, deleteTrade };
}

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<WatchlistTrade[]>(() => load("tj_watchlist", []));
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    void fetchWatchlistFromSupabase().then((remoteWatchlist) => {
      if (!mounted.current || remoteWatchlist == null) return;
      setWatchlist(remoteWatchlist);
      persist("tj_watchlist", remoteWatchlist);
    });

    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    persist("tj_watchlist", watchlist);
  }, [watchlist]);

  const addToWatchlist = async (item: WatchlistTrade) => {
    setWatchlist((previous) => [item, ...previous]);

    const remoteItem = await createWatchlistInSupabase(item);
    if (!remoteItem || !mounted.current) return;

    setWatchlist((previous) => [remoteItem, ...previous.filter((entry) => entry.id !== item.id)]);
  };

  const updateWatchlist = (id: string, patch: Partial<WatchlistTrade>) => {
    setWatchlist((previous) => previous.map((item) => (item.id === id ? { ...item, ...patch } : item)));

    void updateWatchlistInSupabase(id, patch).then((remoteItem) => {
      if (!remoteItem || !mounted.current) return;
      setWatchlist((previous) => replaceById(previous, remoteItem));
    });
  };

  const deleteFromWatchlist = (id: string) => {
    setWatchlist((previous) => previous.filter((item) => item.id !== id));
    void deleteWatchlistFromSupabase(id);
  };

  return { watchlist, addToWatchlist, updateWatchlist, deleteFromWatchlist };
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() =>
    load("tj_settings", { totalCapital: 10000 }),
  );
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    const onRemoteSettings = (remoteSettings: Settings) => {
      if (!mounted.current) return;
      setSettings(remoteSettings);
    };
    settingsSubscribers.add(onRemoteSettings);

    void pullSettingsFromRemote();

    return () => {
      mounted.current = false;
      settingsSubscribers.delete(onRemoteSettings);
    };
  }, []);

  const updateSettings = (patch: Partial<Settings>) => {
    setSettings((previous) => {
      const next = { ...previous, ...patch };
      persist("tj_settings", next);
      void updateSettingsInSupabase(next).then((remoteSettings) => {
        if (!remoteSettings || !mounted.current) return;
        setSettings(remoteSettings);
        persist("tj_settings", remoteSettings);
      });
      return next;
    });
  };

  const refreshSettings = (): Promise<void> => pullSettingsFromRemote();

  return { settings, updateSettings, refreshSettings };
}

export function useCapitalAdjustments() {
  const [adjustments, setAdjustments] = useState<CapitalAdjustment[]>(() =>
    load("tj_capital_adjustments", []),
  );
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    void fetchCapitalAdjustmentsFromSupabase().then((remoteAdjustments) => {
      if (!mounted.current || remoteAdjustments == null) return;
      setAdjustments(remoteAdjustments);
      persist("tj_capital_adjustments", remoteAdjustments);
    });

    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    persist("tj_capital_adjustments", adjustments);
  }, [adjustments]);

  const addCapitalAdjustment = async (
    adjustment: Omit<CapitalAdjustment, "id" | "createdAt">,
  ): Promise<CapitalAdjustment | null> => {
    const local: CapitalAdjustment = {
      ...adjustment,
      id: `ca-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setAdjustments((previous) => [local, ...previous]);

    const remote = await createCapitalAdjustmentInSupabase(local);
    if (!remote || !mounted.current) return null;

    setAdjustments((previous) => [remote, ...previous.filter((item) => item.id !== local.id)]);
    await pullSettingsFromRemote();
    return remote;
  };

  const deleteCapitalAdjustment = async (id: string) => {
    setAdjustments((previous) => previous.filter((item) => item.id !== id));
    await deleteCapitalAdjustmentFromSupabase(id);
    await pullSettingsFromRemote();
  };

  return { adjustments, addCapitalAdjustment, deleteCapitalAdjustment };
}
