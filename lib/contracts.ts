export type Availability = "fixture" | "live" | "delayed" | "end_of_day" | "stale" | "unavailable";

export type ClaimBasis = "reported" | "analysis" | "fixture";

export type DataMeta = {
  sourceName: string;
  sourceUrl: string;
  observedAt?: string;
  publishedAt?: string;
  fetchedAt: string;
  availability: Availability;
  delayLabel: string;
  timezone: string;
};

export type MarketInstrument = {
  id: string;
  name: string;
  symbol: string;
  region: "India" | "US" | "Global";
  kind: "index" | "commodity" | "fx" | "yield" | "equity";
  value: number;
  unit: string;
  currency?: "INR" | "USD";
  change: number;
  changePercent?: number;
  session: string;
  status: "open" | "closed" | "last_session" | "fixture";
  meta: DataMeta;
  history: Array<{ date: string; value: number }>;
};

export type Story = {
  id: string;
  rank: number;
  headline: string;
  summary: string;
  geography: "India" | "US" | "Global";
  category: "economy" | "central banks" | "markets" | "companies" | "geopolitics" | "technology" | "policy";
  readMinutes: number;
  source: string;
  sourceUrl: string;
  publishedAt: string;
  claimBasis: ClaimBasis;
  sourceAccess: "metadata_only" | "linked_article" | "official_release" | "licensed_content";
  summaryVersion: string;
  whatHappened: string[];
  reportedDrivers: string[];
  potentialImplications: string[];
  relatedInstruments: string[];
};

export type CalendarEvent = {
  id: string;
  title: string;
  region: "India" | "US" | "Global";
  importance: "high" | "medium" | "low";
  status: "scheduled" | "tentative" | "postponed" | "released" | "cancelled";
  startsAt: string;
  sourceName: string;
  sourceUrl: string;
  actual?: string;
  forecast?: string;
  previous?: string;
  unit?: string;
  context: string;
  availability: Availability;
};

export type WatchInstrument = {
  id: string;
  symbol: string;
  name: string;
  exchange: string;
  currency: "INR" | "USD";
  sector: string;
  note: string;
};

export type SavedStory = {
  storyId: string;
  savedAt: string;
};

export type AppState = {
  savedStories: SavedStory[];
  completedStoryIds: string[];
  watchlist: WatchInstrument[];
};
