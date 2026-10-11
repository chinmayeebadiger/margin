import type { AppState } from "./contracts";
import { starterWatchlist } from "./catalog";

const storageKey = "market-brief-state-v1";

export const defaultState: AppState = {
  savedStories: [],
  completedStoryIds: [],
  watchlist: starterWatchlist
};

export function loadState(): AppState {
  if (typeof window === "undefined") {
    return defaultState;
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return defaultState;
    }

    const parsed = JSON.parse(raw) as Partial<AppState>;

    return {
      savedStories: parsed.savedStories ?? [],
      completedStoryIds: parsed.completedStoryIds ?? [],
      watchlist: Array.isArray(parsed.watchlist) ? parsed.watchlist : starterWatchlist
    };
  } catch {
    return defaultState;
  }
}

export function saveState(state: AppState) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // Safari private mode or a full storage quota should not break navigation.
  }
}

export function clearState() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // The in-memory reset can still proceed when Safari storage is unavailable.
  }
}
