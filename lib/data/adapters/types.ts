import type { Availability, CalendarEvent, MarketInstrument, Story } from "@/lib/contracts";

export type ProviderStatus = "ok" | "partial" | "blocked" | "failed";

export type ProviderCheck<T = unknown> = {
  provider: string;
  status: ProviderStatus;
  sourceUrl: string;
  checkedAt: string;
  availability: Availability | "requires_key" | "rate_limited";
  message: string;
  sample?: T;
};

export type MarketDataAdapter = {
  provider: string;
  quote(symbol: string): Promise<ProviderCheck<MarketInstrument>>;
};

export type NewsDiscoveryAdapter = {
  provider: string;
  search(query: string): Promise<ProviderCheck<Story[]>>;
};

export type CalendarAdapter = {
  provider: string;
  upcoming(): Promise<ProviderCheck<CalendarEvent[]>>;
};

export type MacroDataAdapter = {
  provider: string;
  series(seriesId: string): Promise<ProviderCheck>;
};
