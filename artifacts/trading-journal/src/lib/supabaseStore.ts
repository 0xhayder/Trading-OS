import type { Settings, Trade, WatchlistTrade } from "./types";

async function requestJson<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(`/api/trade-data/${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error ?? `Request failed with ${response.status}`);
    }

    if (response.status === 204) return null;
    return (await response.json()) as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[TradeOS API] ${path}: ${message}`);
    return null;
  }
}

export async function fetchTradesFromSupabase(): Promise<Trade[] | null> {
  return requestJson<Trade[]>("trades");
}

export async function createTradeInSupabase(trade: Trade): Promise<Trade | null> {
  return requestJson<Trade>("trades", {
    method: "POST",
    body: JSON.stringify(trade),
  });
}

export async function updateTradeInSupabase(id: string, patch: Partial<Trade>): Promise<Trade | null> {
  return requestJson<Trade>(`trades/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function deleteTradeFromSupabase(id: string): Promise<boolean> {
  await requestJson<never>(`trades/${id}`, { method: "DELETE" });
  return true;
}

export async function fetchWatchlistFromSupabase(): Promise<WatchlistTrade[] | null> {
  return requestJson<WatchlistTrade[]>("watchlist");
}

export async function createWatchlistInSupabase(item: WatchlistTrade): Promise<WatchlistTrade | null> {
  return requestJson<WatchlistTrade>("watchlist", {
    method: "POST",
    body: JSON.stringify(item),
  });
}

export async function updateWatchlistInSupabase(
  id: string,
  patch: Partial<WatchlistTrade>,
): Promise<WatchlistTrade | null> {
  return requestJson<WatchlistTrade>(`watchlist/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function deleteWatchlistFromSupabase(id: string): Promise<boolean> {
  await requestJson<never>(`watchlist/${id}`, { method: "DELETE" });
  return true;
}

export async function fetchSettingsFromSupabase(): Promise<Settings | null> {
  return requestJson<Settings>("settings");
}

export async function updateSettingsInSupabase(settings: Settings): Promise<Settings | null> {
  return requestJson<Settings>("settings", {
    method: "PUT",
    body: JSON.stringify(settings),
  });
}
