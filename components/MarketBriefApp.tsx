"use client";

import {
  Bell,
  Bookmark,
  BookmarkCheck,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Download,
  ExternalLink,
  FileText,
  GripVertical,
  Home,
  Info,
  LineChart,
  ListPlus,
  RotateCcw,
  Search,
  Settings,
  Trash2
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { AppState, CalendarEvent, MarketInstrument, Story, WatchInstrument } from "@/lib/contracts";
import { briefingStories, calendarEvents, marketInstruments, starterWatchlist } from "@/lib/fixtures";
import { clearState, defaultState, loadState, saveState } from "@/lib/storage";

type TabId = "today" | "markets" | "watchlist" | "saved" | "settings";
type MarketFilter = "All" | "India" | "US" | "Global";
type DataMode = "fixture" | "mixed" | "live" | "loading" | "error";

type MarketDataResponse = {
  instruments: MarketInstrument[];
  fetchedAt: string;
  status: "fixture" | "mixed" | "live";
  notes: string[];
};

type CalendarResponse = {
  events: CalendarEvent[];
  fetchedAt: string;
  status: "fixture" | "mixed" | "live";
  notes: string[];
};

const tabs: Array<{ id: TabId; label: string; icon: typeof Home }> = [
  { id: "today", label: "Today", icon: Home },
  { id: "markets", label: "Markets", icon: LineChart },
  { id: "watchlist", label: "Watch", icon: CircleDollarSign },
  { id: "saved", label: "Saved", icon: Bookmark },
  { id: "settings", label: "Settings", icon: Settings }
];

export function MarketBriefApp() {
  const [tab, setTab] = useState<TabId>("today");
  const [state, setState] = useState<AppState>(defaultState);
  const [hydrated, setHydrated] = useState(false);
  const [instruments, setInstruments] = useState<MarketInstrument[]>(marketInstruments);
  const [events, setEvents] = useState<CalendarEvent[]>(calendarEvents);
  const [dataMode, setDataMode] = useState<DataMode>("loading");
  const [dataNotes, setDataNotes] = useState<string[]>([]);
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [marketFilter, setMarketFilter] = useState<MarketFilter>("All");
  const [watchQuery, setWatchQuery] = useState("");
  const [installReady, setInstallReady] = useState(false);

  useEffect(() => {
    setState(loadState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      saveState(state);
    }
  }, [hydrated, state]);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    setInstallReady(window.matchMedia("(display-mode: standalone)").matches);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadLiveData() {
      setDataMode("loading");
      const notes: string[] = [];

      try {
        const [marketResponse, calendarResponse] = await Promise.all([
          fetch("/api/market-data", { cache: "no-store" }),
          fetch("/api/calendar", { cache: "no-store" })
        ]);

        if (!marketResponse.ok || !calendarResponse.ok) {
          throw new Error("One or more data routes failed.");
        }

        const marketPayload = (await marketResponse.json()) as MarketDataResponse;
        const calendarPayload = (await calendarResponse.json()) as CalendarResponse;

        if (cancelled) {
          return;
        }

        setInstruments(marketPayload.instruments);
        setEvents(calendarPayload.events);
        notes.push(...marketPayload.notes, ...calendarPayload.notes);
        setDataNotes(notes);
        setLastFetchedAt(marketPayload.fetchedAt);
        setDataMode(resolveDataMode([marketPayload.status, calendarPayload.status]));
      } catch (error) {
        if (cancelled) {
          return;
        }

        setDataMode("error");
        setDataNotes([error instanceof Error ? error.message : "Live data fetch failed. Fixture fallback is active."]);
        setLastFetchedAt(null);
      }
    }

    loadLiveData();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedStory = useMemo(
    () => briefingStories.find((story) => story.id === selectedStoryId) ?? null,
    [selectedStoryId]
  );
  const instrumentLookup = useMemo(() => new Map(instruments.map((instrument) => [instrument.id, instrument])), [instruments]);

  const completedCount = state.completedStoryIds.length;
  const progressPercent = Math.round((completedCount / briefingStories.length) * 100);

  function updateState(updater: (current: AppState) => AppState) {
    setState((current) => updater(current));
  }

  function toggleSaved(storyId: string) {
    updateState((current) => {
      const exists = current.savedStories.some((saved) => saved.storyId === storyId);
      return {
        ...current,
        savedStories: exists
          ? current.savedStories.filter((saved) => saved.storyId !== storyId)
          : [{ storyId, savedAt: new Date().toISOString() }, ...current.savedStories]
      };
    });
  }

  function markComplete(storyId: string) {
    updateState((current) => ({
      ...current,
      completedStoryIds: current.completedStoryIds.includes(storyId)
        ? current.completedStoryIds
        : [...current.completedStoryIds, storyId]
    }));
  }

  function resetLocalState() {
    clearState();
    setState(defaultState);
  }

  return (
    <main className="min-h-screen bg-shell text-ink">
      <div className="mx-auto flex min-h-screen w-full max-w-[520px] flex-col">
        <Header tab={tab} progressPercent={progressPercent} dataMode={dataMode} />

        <section className="flex-1 px-4 pb-28 pt-3">
          {selectedStory ? (
            <StoryDetail
              story={selectedStory}
              isSaved={state.savedStories.some((saved) => saved.storyId === selectedStory.id)}
              isComplete={state.completedStoryIds.includes(selectedStory.id)}
              onBack={() => setSelectedStoryId(null)}
              onSave={() => toggleSaved(selectedStory.id)}
              onComplete={() => markComplete(selectedStory.id)}
              instrumentLookup={instrumentLookup}
            />
          ) : calendarOpen ? (
            <CalendarScreen events={events} dataMode={dataMode} onBack={() => setCalendarOpen(false)} />
          ) : (
            <>
              {tab === "today" && (
                <TodayScreen
                  instruments={instruments}
                  events={events}
                  dataMode={dataMode}
                  completedCount={completedCount}
                  progressPercent={progressPercent}
                  savedStoryIds={state.savedStories.map((saved) => saved.storyId)}
                  completedStoryIds={state.completedStoryIds}
                  onOpenStory={setSelectedStoryId}
                  onToggleSaved={toggleSaved}
                  onComplete={markComplete}
                  onCalendar={() => setCalendarOpen(true)}
                />
              )}
              {tab === "markets" && (
                <MarketsScreen instruments={instruments} filter={marketFilter} dataMode={dataMode} onFilter={setMarketFilter} />
              )}
              {tab === "watchlist" && (
                <WatchlistScreen
                  watchlist={state.watchlist}
                  query={watchQuery}
                  onQuery={setWatchQuery}
                  onAdd={(item) =>
                    updateState((current) => ({
                      ...current,
                      watchlist: current.watchlist.some((watch) => watch.id === item.id)
                        ? current.watchlist
                        : [...current.watchlist, item]
                    }))
                  }
                  onRemove={(id) =>
                    updateState((current) => ({
                      ...current,
                      watchlist: current.watchlist.filter((watch) => watch.id !== id)
                    }))
                  }
                  onNote={(id, note) =>
                    updateState((current) => ({
                      ...current,
                      watchlist: current.watchlist.map((watch) => (watch.id === id ? { ...watch, note } : watch))
                    }))
                  }
                  onMove={(id, direction) =>
                    updateState((current) => ({ ...current, watchlist: moveWatchItem(current.watchlist, id, direction) }))
                  }
                />
              )}
              {tab === "saved" && (
                <SavedScreen
                  savedStories={state.savedStories}
                  onOpenStory={setSelectedStoryId}
                  onRemove={toggleSaved}
                />
              )}
              {tab === "settings" && (
                <SettingsScreen installReady={installReady} dataMode={dataMode} dataNotes={dataNotes} lastFetchedAt={lastFetchedAt} onReset={resetLocalState} />
              )}
            </>
          )}
        </section>

        {!selectedStory && !calendarOpen && <BottomNav activeTab={tab} onChange={setTab} />}
      </div>
    </main>
  );
}

function Header({ tab, progressPercent, dataMode }: { tab: TabId; progressPercent: number; dataMode: DataMode }) {
  const title = tabs.find((item) => item.id === tab)?.label ?? "Today";

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-shell/95 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+12px)] backdrop-blur">
      <div className="flex min-h-11 items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">Market Brief</p>
          <h1 className="text-[22px] font-semibold leading-tight tracking-normal">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill label={dataModeLabel(dataMode)} tone={dataMode === "live" ? "default" : "warn"} />
          <IconButton label="Notifications off">
            <Bell size={18} />
          </IconButton>
        </div>
      </div>
      {tab === "today" && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line" aria-label={`Briefing progress ${progressPercent}%`}>
          <div className="h-full rounded-full bg-ink" style={{ width: `${progressPercent}%` }} />
        </div>
      )}
    </header>
  );
}

function TodayScreen({
  instruments,
  events,
  dataMode,
  completedCount,
  progressPercent,
  savedStoryIds,
  completedStoryIds,
  onOpenStory,
  onToggleSaved,
  onComplete,
  onCalendar
}: {
  instruments: MarketInstrument[];
  events: CalendarEvent[];
  dataMode: DataMode;
  completedCount: number;
  progressPercent: number;
  savedStoryIds: string[];
  completedStoryIds: string[];
  onOpenStory: (id: string) => void;
  onToggleSaved: (id: string) => void;
  onComplete: (id: string) => void;
  onCalendar: () => void;
}) {
  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-line bg-panel p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted">Thursday, 8 Oct 2026 · 10:00 IST</p>
            <h2 className="mt-1 text-xl font-semibold leading-tight">15-minute briefing</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              {completedCount} of {briefingStories.length} stories done. Market data mode: {dataModeLabel(dataMode).toLowerCase()}.
            </p>
          </div>
          <div className="min-w-[64px] rounded-md border border-line bg-panel2 px-2 py-2 text-center">
            <p className="tabular text-lg font-semibold">{progressPercent}%</p>
            <p className="text-[11px] text-muted">read</p>
          </div>
        </div>
      </section>

      <MarketSnapshot instruments={instruments} dataMode={dataMode} compact />

      <SectionHeader
        title="Ranked stories"
        action={
          <button className="flex min-h-11 items-center gap-2 text-sm text-muted" onClick={onCalendar}>
            <CalendarDays size={16} />
            Calendar
          </button>
        }
      />

      <div className="space-y-2">
        {briefingStories.map((story) => (
          <StoryRow
            key={story.id}
            story={story}
            isSaved={savedStoryIds.includes(story.id)}
            isComplete={completedStoryIds.includes(story.id)}
            onOpen={() => onOpenStory(story.id)}
            onSave={() => onToggleSaved(story.id)}
            onComplete={() => onComplete(story.id)}
          />
        ))}
      </div>

      <section className="rounded-lg border border-line bg-panel p-4">
        <p className="text-sm font-semibold">Upcoming</p>
        <div className="mt-3 space-y-3">
          {events.slice(0, 2).map((event) => (
            <CalendarEventRow key={event.id} event={event} />
          ))}
        </div>
      </section>
    </div>
  );
}

function MarketSnapshot({ instruments, dataMode, compact = false }: { instruments: MarketInstrument[]; dataMode: DataMode; compact?: boolean }) {
  const snapshot = instruments.slice(0, compact ? 4 : instruments.length);

  return (
    <section className="rounded-lg border border-line bg-panel">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div>
          <p className="text-sm font-semibold">Market snapshot</p>
          <p className="text-xs text-muted">Source, time, and delay visible by row</p>
        </div>
        <StatusPill label={dataModeLabel(dataMode)} tone={dataMode === "live" ? "default" : "warn"} />
      </div>
      <div className="divide-y divide-line">
        {snapshot.map((instrument) => (
          <InstrumentRow key={instrument.id} instrument={instrument} />
        ))}
      </div>
    </section>
  );
}

function StoryRow({
  story,
  isSaved,
  isComplete,
  onOpen,
  onSave,
  onComplete
}: {
  story: Story;
  isSaved: boolean;
  isComplete: boolean;
  onOpen: () => void;
  onSave: () => void;
  onComplete: () => void;
}) {
  return (
    <article className="rounded-lg border border-line bg-panel">
      <button className="w-full px-4 py-4 text-left" onClick={onOpen}>
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line bg-panel2 tabular text-sm text-muted">
            {story.rank}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted">{story.geography}</span>
              <span className="h-1 w-1 rounded-full bg-muted" />
              <span className="text-xs text-muted">{story.category}</span>
              {isComplete && <Check size={14} className="text-up" aria-label="Complete" />}
            </div>
            <h3 className="mt-1 text-[15px] font-semibold leading-5">{story.headline}</h3>
            <p className="mt-2 line-clamp-2 text-sm leading-5 text-muted">{story.summary}</p>
          </div>
          <ChevronRight size={18} className="mt-1 shrink-0 text-muted" />
        </div>
      </button>
      <div className="flex items-center justify-between border-t border-line px-4 py-2">
        <p className="text-xs text-muted">{story.source} · {story.readMinutes} min</p>
        <div className="flex items-center gap-1">
          <IconButton label={isSaved ? "Remove saved story" : "Save story"} onClick={onSave}>
            {isSaved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
          </IconButton>
          <IconButton label="Mark complete" onClick={onComplete}>
            <Check size={18} />
          </IconButton>
        </div>
      </div>
    </article>
  );
}

function StoryDetail({
  story,
  isSaved,
  isComplete,
  onBack,
  onSave,
  onComplete,
  instrumentLookup
}: {
  story: Story;
  isSaved: boolean;
  isComplete: boolean;
  onBack: () => void;
  onSave: () => void;
  onComplete: () => void;
  instrumentLookup: Map<string, MarketInstrument>;
}) {
  return (
    <article className="space-y-4">
      <button className="flex min-h-11 items-center gap-2 text-sm text-muted" onClick={onBack}>
        <ChevronLeft size={18} />
        Back to briefing
      </button>

      <section className="rounded-lg border border-line bg-panel p-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill label={story.geography} />
          <StatusPill label={story.category} />
          <StatusPill label={story.claimBasis} tone="warn" />
        </div>
        <h2 className="mt-3 text-2xl font-semibold leading-tight">{story.headline}</h2>
        <p className="mt-3 text-[15px] leading-6 text-muted">{story.summary}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="inline-flex min-h-11 items-center gap-2 rounded-md bg-ink px-3 text-sm font-semibold text-shell" onClick={onSave}>
            {isSaved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
            {isSaved ? "Saved" : "Save"}
          </button>
          <button className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line px-3 text-sm text-ink" onClick={onComplete}>
            <Check size={18} />
            {isComplete ? "Completed" : "Mark read"}
          </button>
        </div>
      </section>

      <DetailBlock title="What happened" items={story.whatHappened} />
      <DetailBlock title="Reported drivers" items={story.reportedDrivers} />
      <DetailBlock title="Potential implications" items={story.potentialImplications} />

      <section className="rounded-lg border border-line bg-panel p-4">
        <p className="text-sm font-semibold">Related markets</p>
        <div className="mt-3 divide-y divide-line">
          {story.relatedInstruments.map((id) => {
            const instrument = instrumentLookup.get(id);
            return instrument ? <InstrumentRow key={id} instrument={instrument} embedded /> : null;
          })}
        </div>
      </section>

      <section className="rounded-lg border border-line bg-panel p-4">
        <p className="text-sm font-semibold">Source and trust</p>
        <dl className="mt-3 space-y-2 text-sm">
          <MetaRow label="Source" value={story.source} />
          <MetaRow label="Published" value={formatDateTime(story.publishedAt)} />
          <MetaRow label="Access" value={story.sourceAccess.replaceAll("_", " ")} />
          <MetaRow label="Summary" value={story.summaryVersion} />
        </dl>
        <a className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm text-ink" href={story.sourceUrl} target="_blank" rel="noreferrer">
          Open source
          <ExternalLink size={16} />
        </a>
      </section>
    </article>
  );
}

function MarketsScreen({
  instruments,
  filter,
  dataMode,
  onFilter
}: {
  instruments: MarketInstrument[];
  filter: MarketFilter;
  dataMode: DataMode;
  onFilter: (filter: MarketFilter) => void;
}) {
  const filters: MarketFilter[] = ["All", "India", "US", "Global"];
  const visible = instruments.filter((instrument) => filter === "All" || instrument.region === filter);

  return (
    <div className="space-y-5">
      <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1">
        {filters.map((item) => (
          <button
            key={item}
            className={`min-h-11 rounded-md border px-4 text-sm ${
              filter === item ? "border-ink bg-ink text-shell" : "border-line bg-panel text-muted"
            }`}
            onClick={() => onFilter(item)}
          >
            {item}
          </button>
        ))}
      </div>

      <MarketSnapshot instruments={instruments} dataMode={dataMode} />

      <SectionHeader title="Daily lines" />
      <div className="space-y-3">
        {visible.map((instrument) => (
          <section key={instrument.id} className="rounded-lg border border-line bg-panel p-4">
            <InstrumentRow instrument={instrument} embedded />
            <MiniChart instrument={instrument} />
          </section>
        ))}
      </div>
    </div>
  );
}

function CalendarScreen({ events, dataMode, onBack }: { events: CalendarEvent[]; dataMode: DataMode; onBack: () => void }) {
  return (
    <div className="space-y-5">
      <button className="flex min-h-11 items-center gap-2 text-sm text-muted" onClick={onBack}>
        <ChevronLeft size={18} />
        Back to Today
      </button>

      <section className="rounded-lg border border-line bg-panel p-4">
        <div className="flex items-start gap-3">
          <CalendarDays size={20} className="mt-0.5 shrink-0 text-muted" />
          <div>
            <h2 className="text-base font-semibold">Economic calendar</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              {dataMode === "loading" ? "Loading official releases." : "Official-source releases and fixture events use Asia/Kolkata display time. Forecast and actual fields remain blank unless a source supplies them."}
            </p>
          </div>
        </div>
      </section>

      <div className="space-y-3">
        {events.map((event) => (
          <section key={event.id} className="rounded-lg border border-line bg-panel p-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill label={event.region} />
              <StatusPill label={event.status} />
              <StatusPill label={event.availability} tone="warn" />
            </div>
            <h3 className="mt-3 text-base font-semibold">{event.title}</h3>
            <p className="mt-1 text-sm text-muted">{formatDateTime(event.startsAt)}</p>
            <p className="mt-3 text-sm leading-6 text-muted">{event.context}</p>
            <dl className="mt-3 space-y-2 text-sm">
              <MetaRow label="Actual" value={event.actual ?? "-"} />
              <MetaRow label="Forecast" value={event.forecast ?? "-"} />
              <MetaRow label="Previous" value={event.previous ?? "-"} />
              <MetaRow label="Source" value={event.sourceName} />
            </dl>
            <a className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm text-ink" href={event.sourceUrl} target="_blank" rel="noreferrer">
              Open source
              <ExternalLink size={16} />
            </a>
          </section>
        ))}
      </div>
    </div>
  );
}

function WatchlistScreen({
  watchlist,
  query,
  onQuery,
  onAdd,
  onRemove,
  onNote,
  onMove
}: {
  watchlist: WatchInstrument[];
  query: string;
  onQuery: (query: string) => void;
  onAdd: (item: WatchInstrument) => void;
  onRemove: (id: string) => void;
  onNote: (id: string, note: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
}) {
  const candidates = starterWatchlist.filter((item) => {
    const haystack = `${item.name} ${item.symbol} ${item.exchange}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  });

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-line bg-panel p-4">
        <label className="text-sm font-semibold" htmlFor="instrument-search">
          Add instrument
        </label>
        <div className="mt-3 flex min-h-11 items-center gap-2 rounded-md border border-line bg-panel2 px-3">
          <Search size={18} className="text-muted" />
          <input
            id="instrument-search"
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="Search name or ticker"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
          />
        </div>
        <div className="mt-3 space-y-2">
          {candidates.map((item) => (
            <button
              key={item.id}
              className="flex min-h-11 w-full items-center justify-between rounded-md border border-line px-3 text-left"
              onClick={() => onAdd(item)}
            >
              <span>
                <span className="block text-sm font-semibold">{item.symbol}</span>
                <span className="block text-xs text-muted">{item.name} · {item.exchange} · {item.currency}</span>
              </span>
              <ListPlus size={18} className="text-muted" />
            </button>
          ))}
        </div>
      </section>

      <SectionHeader title="One list" />
      <div className="space-y-3">
        {watchlist.map((item, index) => (
          <section key={item.id} className="rounded-lg border border-line bg-panel p-4">
            <div className="flex items-start gap-3">
              <GripVertical size={18} className="mt-1 shrink-0 text-muted" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold">{item.symbol}</p>
                    <p className="text-sm text-muted">{item.name}</p>
                    <p className="mt-1 text-xs text-muted">{item.exchange} · {item.currency} · {item.sector}</p>
                  </div>
                  <IconButton label="Remove instrument" onClick={() => onRemove(item.id)}>
                    <Trash2 size={18} />
                  </IconButton>
                </div>
                <textarea
                  value={item.note}
                  onChange={(event) => onNote(item.id, event.target.value)}
                  className="mt-3 min-h-[72px] w-full resize-none rounded-md border border-line bg-panel2 p-3 text-sm leading-5 outline-none placeholder:text-muted"
                  placeholder="Personal note"
                />
                <div className="mt-2 flex gap-2">
                  <button
                    className="min-h-11 rounded-md border border-line px-3 text-sm text-muted disabled:opacity-40"
                    disabled={index === 0}
                    onClick={() => onMove(item.id, -1)}
                  >
                    Up
                  </button>
                  <button
                    className="min-h-11 rounded-md border border-line px-3 text-sm text-muted disabled:opacity-40"
                    disabled={index === watchlist.length - 1}
                    onClick={() => onMove(item.id, 1)}
                  >
                    Down
                  </button>
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function SavedScreen({
  savedStories,
  onOpenStory,
  onRemove
}: {
  savedStories: AppState["savedStories"];
  onOpenStory: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const saved = savedStories
    .map((savedStory) => ({
      savedStory,
      story: briefingStories.find((story) => story.id === savedStory.storyId)
    }))
    .filter((item): item is { savedStory: AppState["savedStories"][number]; story: Story } => Boolean(item.story));

  if (!saved.length) {
    return (
      <EmptyState
        icon={Bookmark}
        title="No saved stories yet"
        text="Save any briefing story and it will appear here with its source link and cached fixture summary."
      />
    );
  }

  return (
    <div className="space-y-3">
      {saved.map(({ savedStory, story }) => (
        <article key={story.id} className="rounded-lg border border-line bg-panel p-4">
          <button className="w-full text-left" onClick={() => onOpenStory(story.id)}>
            <p className="text-xs text-muted">Saved {formatDateTime(savedStory.savedAt)}</p>
            <h2 className="mt-1 text-base font-semibold leading-5">{story.headline}</h2>
            <p className="mt-2 text-sm leading-5 text-muted">{story.summary}</p>
          </button>
          <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
            <p className="text-xs text-muted">{story.source}</p>
            <IconButton label="Remove saved story" onClick={() => onRemove(story.id)}>
              <Trash2 size={18} />
            </IconButton>
          </div>
        </article>
      ))}
    </div>
  );
}

function SettingsScreen({
  installReady,
  dataMode,
  dataNotes,
  lastFetchedAt,
  onReset
}: {
  installReady: boolean;
  dataMode: DataMode;
  dataNotes: string[];
  lastFetchedAt: string | null;
  onReset: () => void;
}) {
  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-line bg-panel p-4">
        <div className="flex items-start gap-3">
          <Info size={20} className="mt-0.5 shrink-0 text-muted" />
          <div>
            <h2 className="text-base font-semibold">Prototype data mode</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Current mode: {dataModeLabel(dataMode)}. Gold and USD/INR can use Twelve Data, US 10-year can use FRED, and official releases can use RBI/Fed RSS. Unconfirmed markets stay fixture-backed.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-line bg-panel p-4">
        <div className="flex items-start gap-3">
          <Download size={20} className="mt-0.5 shrink-0 text-muted" />
          <div>
            <h2 className="text-base font-semibold">Install on iPhone</h2>
            <ol className="mt-2 space-y-2 text-sm leading-6 text-muted">
              <li>1. Open this app in Safari.</li>
              <li>2. Tap Share.</li>
              <li>3. Choose Add to Home Screen.</li>
            </ol>
            <p className="mt-3 text-xs text-muted">
              Standalone mode detected: {installReady ? "yes" : "not yet"}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-line bg-panel p-4">
        <h2 className="text-base font-semibold">Preferences</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <MetaRow label="Timezone" value="Asia/Kolkata" />
          <MetaRow label="Notifications" value="Off" />
          <MetaRow label="Auth" value="Not required" />
          <MetaRow label="Data fetched" value={lastFetchedAt ? formatDateTime(lastFetchedAt) : "Fixture fallback"} />
        </dl>
      </section>

      {!!dataNotes.length && (
        <section className="rounded-lg border border-line bg-panel p-4">
          <h2 className="text-base font-semibold">Data notes</h2>
          <ul className="mt-3 space-y-2">
            {dataNotes.map((note) => (
              <li key={note} className="text-sm leading-6 text-muted">{note}</li>
            ))}
          </ul>
        </section>
      )}

      <button className="flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-line text-sm text-ink" onClick={onReset}>
        <RotateCcw size={18} />
        Reset local prototype data
      </button>
    </div>
  );
}

function BottomNav({ activeTab, onChange }: { activeTab: TabId; onChange: (tab: TabId) => void }) {
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-panel/98 shadow-nav backdrop-blur">
      <div className="mx-auto grid max-w-[520px] grid-cols-5 px-2 py-2">
        {tabs.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-md text-[11px] ${
                active ? "text-ink" : "text-muted"
              }`}
              onClick={() => onChange(item.id)}
            >
              <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function InstrumentRow({ instrument, embedded = false }: { instrument: MarketInstrument; embedded?: boolean }) {
  const positive = instrument.change >= 0;
  const changeText =
    instrument.kind === "yield"
      ? `${positive ? "+" : ""}${(instrument.change * 100).toFixed(0)} bp`
      : `${positive ? "+" : ""}${formatNumber(instrument.change)}${instrument.changePercent !== undefined ? ` (${positive ? "+" : ""}${instrument.changePercent.toFixed(2)}%)` : ""}`;

  return (
    <div className={embedded ? "py-3 first:pt-0 last:pb-0" : "px-4 py-3"}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{instrument.name}</p>
          <p className="mt-0.5 text-xs text-muted">{instrument.symbol} · {instrument.session}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="tabular text-sm font-semibold">{formatNumber(instrument.value)} {instrument.unit}</p>
          <p className={`tabular text-xs ${positive ? "text-up" : "text-down"}`}>{changeText}</p>
        </div>
      </div>
      <p className="mt-2 text-[11px] leading-4 text-muted">
        {instrument.meta.sourceName} · {formatDateTime(instrument.meta.observedAt ?? instrument.meta.fetchedAt)} · {instrument.meta.delayLabel}
      </p>
    </div>
  );
}

function MiniChart({ instrument }: { instrument: MarketInstrument }) {
  const values = instrument.history.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = instrument.history
    .map((point, index) => {
      const x = (index / Math.max(instrument.history.length - 1, 1)) * 280;
      const y = 72 - ((point.value - min) / range) * 56;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="mt-3 rounded-md border border-line bg-panel2 p-3">
      <svg viewBox="0 0 280 82" className="h-[82px] w-full" role="img" aria-label={`${instrument.name} daily fixture chart`}>
        <line x1="0" y1="72" x2="280" y2="72" stroke="#26292F" strokeWidth="1" />
        <polyline points={points} fill="none" stroke={instrument.change >= 0 ? "#4DAA72" : "#E46F6F"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="mt-2 flex justify-between text-[11px] text-muted">
        <span>{instrument.history[0]?.date}</span>
        <span>{instrument.history.at(-1)?.date}</span>
      </div>
    </div>
  );
}

function CalendarEventRow({ event }: { event: CalendarEvent }) {
  return (
    <div className="rounded-md border border-line bg-panel2 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{event.title}</p>
          <p className="mt-1 text-xs text-muted">{formatDateTime(event.startsAt)} · {event.region}</p>
        </div>
        <StatusPill label={event.importance} tone={event.importance === "high" ? "warn" : "default"} />
      </div>
      <p className="mt-2 text-sm leading-5 text-muted">{event.context}</p>
    </div>
  );
}

function DetailBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-lg border border-line bg-panel p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="mt-3 space-y-3">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-sm leading-6 text-muted">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ink" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3">
      <h2 className="text-base font-semibold">{title}</h2>
      {action}
    </div>
  );
}

function EmptyState({ icon: Icon, title, text }: { icon: typeof Bookmark; title: string; text: string }) {
  return (
    <section className="rounded-lg border border-line bg-panel p-6 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-md border border-line bg-panel2">
        <Icon size={22} className="text-muted" />
      </div>
      <h2 className="mt-4 text-base font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
    </section>
  );
}

function IconButton({
  label,
  children,
  onClick
}: {
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      className="flex min-h-11 min-w-11 items-center justify-center rounded-md border border-line text-muted"
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function StatusPill({ label, tone = "default" }: { label: string; tone?: "default" | "warn" }) {
  return (
    <span
      className={`inline-flex min-h-6 items-center rounded px-2 text-[11px] font-medium uppercase ${
        tone === "warn" ? "border border-warn/40 text-warn" : "border border-line text-muted"
      }`}
    >
      {label}
    </span>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line pb-2 last:border-0 last:pb-0">
      <dt className="text-muted">{label}</dt>
      <dd className="max-w-[62%] text-right text-ink">{value}</dd>
    </div>
  );
}

function moveWatchItem(list: WatchInstrument[], id: string, direction: -1 | 1) {
  const index = list.findIndex((item) => item.id === id);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= list.length) {
    return list;
  }

  const copy = [...list];
  const [item] = copy.splice(index, 1);
  copy.splice(nextIndex, 0, item);
  return copy;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: value >= 100 ? 2 : 2,
    minimumFractionDigits: value < 10 ? 2 : 0
  }).format(value);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata"
  }).format(new Date(value));
}

function resolveDataMode(statuses: Array<"fixture" | "mixed" | "live">): DataMode {
  if (statuses.every((status) => status === "live")) {
    return "live";
  }
  if (statuses.some((status) => status === "live" || status === "mixed")) {
    return "mixed";
  }
  return "fixture";
}

function dataModeLabel(mode: DataMode) {
  if (mode === "loading") {
    return "Loading";
  }
  if (mode === "mixed") {
    return "Mixed";
  }
  if (mode === "live") {
    return "Live";
  }
  if (mode === "error") {
    return "Fallback";
  }
  return "Fixture";
}
