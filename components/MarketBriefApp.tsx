"use client";

import {
  Bookmark,
  BookmarkCheck,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  Home,
  Info,
  LineChart,
  RotateCcw,
  Settings,
  Sparkles,
  Trash2
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { AppState, CalendarEvent, MarketInstrument, Story } from "@/lib/contracts";
import { clearState, defaultState, loadState, saveState } from "@/lib/storage";

type TabId = "today" | "markets" | "watchlist" | "saved" | "settings";
type MarketFilter = "All" | "India" | "US" | "Global";
type DataMode = "unavailable" | "mixed" | "live" | "loading" | "error";

const tabs: Array<{ id: TabId; label: string; icon: typeof Home }> = [
  { id: "today", label: "Brief", icon: Home },
  { id: "markets", label: "Markets", icon: LineChart },
  { id: "watchlist", label: "Learn", icon: Sparkles },
  { id: "saved", label: "Saved", icon: Bookmark },
  { id: "settings", label: "Settings", icon: Settings }
];

export function MarketBriefApp() {
  const [tab, setTab] = useState<TabId>("today");
  const [state, setState] = useState<AppState>(defaultState);
  const [hydrated, setHydrated] = useState(false);
  const [instruments, setInstruments] = useState<MarketInstrument[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [storyLimit, setStoryLimit] = useState(6);
  const [watchQuotes, setWatchQuotes] = useState<MarketInstrument[]>([]);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [dataMode, setDataMode] = useState<DataMode>("loading");
  const [feedModes, setFeedModes] = useState<Record<string, DataMode>>({ today: "loading", markets: "loading", watchlist: "loading", calendar: "loading" });
  const [dataNotes, setDataNotes] = useState<string[]>([]);
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [marketFilter, setMarketFilter] = useState<MarketFilter>("All");
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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    async function loadLiveData() {
      setDataMode("loading");
      setStoryLimit(6);
      setFeedModes({ today: "loading", markets: "loading", watchlist: "loading", calendar: "loading" });
      const notes: string[] = [];

      try {
        const statuses: Array<"unavailable" | "mixed" | "live"> = [];
        await Promise.all(["market-data", "calendar", "news", "watchlist"].map(async (route, index) => {
          const feed = ["markets", "calendar", "today", "watchlist"][index];
          try {
            const response = await fetch(`/api/${route}`, { cache: "no-store", signal: controller.signal });
            if (!response.ok) throw new Error(`${route} is unavailable.`);
            const payload = await response.json();
            if (cancelled) return;
            statuses.push(payload.status);
            notes.push(...payload.notes);
            if (index === 0) setInstruments(payload.instruments);
            if (index === 1) setEvents(payload.events);
            if (index === 2) {
              setStories(payload.stories);
              setLastFetchedAt(payload.fetchedAt);
            }
            if (index === 3) setWatchQuotes(payload.instruments);
            setFeedModes((current) => ({ ...current, [feed]: payload.status }));
          } catch {
            if (cancelled) return;
            setFeedModes((current) => ({ ...current, [feed]: "unavailable" }));
            notes.push(["Markets", "Calendar", "News", "Watchlist"][index] + " could not be refreshed.");
            statuses.push("unavailable");
            if (index === 0) setInstruments([]);
            if (index === 1) setEvents([]);
            if (index === 2) {
              setStories([]);
              setLastFetchedAt(null);
            }
            if (index === 3) setWatchQuotes([]);
          }
          setDataNotes([...notes]);
        }));
        clearTimeout(timeout);
        if (cancelled) return;
        setDataMode(resolveDataMode(statuses));
      } catch (error) {
        if (cancelled) {
          return;
        }

        setDataMode("error");
        clearTimeout(timeout);
        setDataNotes([error instanceof Error ? error.message : "Data fetch failed."]);
        setLastFetchedAt(null);
      }
    }

    loadLiveData();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [refreshVersion]);

  const selectedStory = useMemo(
    () => stories.find((story) => story.id === selectedStoryId) ?? state.savedStories.find((saved) => saved.storyId === selectedStoryId)?.story ?? null,
    [selectedStoryId, stories, state.savedStories]
  );
  const instrumentLookup = useMemo(() => new Map(instruments.map((instrument) => [instrument.id, instrument])), [instruments]);

  const briefStories = stories.slice(0, storyLimit);
  const completedCount = briefStories.filter((story) => state.completedStoryIds.includes(story.id)).length;
  const progressPercent = briefStories.length ? Math.round((completedCount / briefStories.length) * 100) : 0;

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
          : [{ storyId, savedAt: new Date().toISOString(), story: stories.find((story) => story.id === storyId) }, ...current.savedStories]
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
        <Header tab={tab} progressPercent={progressPercent} dataMode={feedModes[calendarOpen ? "calendar" : tab] ?? dataMode} onRefresh={() => setRefreshVersion((version) => version + 1)} />

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
            <CalendarScreen events={events} dataMode={feedModes.calendar} onBack={() => setCalendarOpen(false)} />
          ) : (
            <>
              {tab === "today" && (
                <TodayScreen
                  stories={briefStories}
                  hasMore={stories.length > storyLimit}
                  onLoadMore={() => setStoryLimit((limit) => limit + 6)}
                  fetchedAt={lastFetchedAt}
                  dataMode={feedModes.today}
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
                <MarketsScreen instruments={instruments} filter={marketFilter} dataMode={feedModes.markets} onFilter={setMarketFilter} />
              )}
              {tab === "watchlist" && (
                <CorrelationLearningScreen
                  stories={stories}
                  instruments={instruments}
                  quotes={watchQuotes}
                  dataMode={feedModes.watchlist}
                  onOpenStory={setSelectedStoryId}
                />
              )}
              {tab === "saved" && (
                <SavedScreen
                  stories={stories}
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

function Header({ tab, progressPercent, dataMode, onRefresh }: { tab: TabId; progressPercent: number; dataMode: DataMode; onRefresh: () => void }) {
  const title = tabs.find((item) => item.id === tab)?.label ?? "Brief";

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-shell/95 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+12px)] backdrop-blur">
      <div className="flex min-h-11 items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">Market Brief</p>
          <h1 className="text-[22px] font-semibold leading-tight tracking-normal">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill label={dataModeLabel(dataMode)} tone={dataMode === "live" ? "default" : "warn"} />
          <button type="button" title="Refresh data" aria-label="Refresh data" disabled={dataMode === "loading"} onClick={onRefresh} className="flex h-11 w-11 items-center justify-center rounded-md border border-line text-muted disabled:opacity-40">
            <RotateCcw size={18} className={dataMode === "loading" ? "animate-spin" : ""} />
          </button>
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
  stories,
  hasMore,
  onLoadMore,
  fetchedAt,
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
  stories: Story[];
  hasMore: boolean;
  onLoadMore: () => void;
  fetchedAt: string | null;
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
            <p className="text-sm text-muted">{fetchedAt ? formatDateTime(fetchedAt) : "Latest briefing"}</p>
            <h2 className="mt-1 text-xl font-semibold leading-tight">15-minute briefing</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              {completedCount} of {stories.length} stories read.
            </p>
          </div>
          <div className="min-w-[64px] rounded-md border border-line bg-panel2 px-2 py-2 text-center">
            <p className="tabular text-lg font-semibold">{progressPercent}%</p>
            <p className="text-[11px] text-muted">read</p>
          </div>
        </div>
      </section>

      <SectionHeader
        title="News articles"
        action={
          <button className="flex min-h-11 items-center gap-2 text-sm text-muted" onClick={onCalendar}>
            <CalendarDays size={16} />
            Calendar
          </button>
        }
      />

      <div className="space-y-2">
        {!stories.length && <EmptyState icon={FileText} title={dataMode === "loading" ? "Loading articles" : "No articles available"} text="News articles will appear when the sources respond." />}
        {stories.map((story) => (
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
      {hasMore && <button type="button" onClick={onLoadMore} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-line text-sm text-ink">
        <ChevronDown size={18} />
        Load more
      </button>}

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
        {!snapshot.length && <p className="p-4 text-sm text-muted">{dataMode === "loading" ? "Loading market data" : "Market data unavailable"}</p>}
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
  const Headline = story.openInPublisher ? "a" : "button";
  return (
    <article className="rounded-lg border border-line bg-panel">
      <Headline className="block w-full px-4 py-4 text-left" href={story.openInPublisher ? story.sourceUrl : undefined} target={story.openInPublisher ? "_blank" : undefined} rel={story.openInPublisher ? "noopener noreferrer" : undefined} onClick={story.openInPublisher ? undefined : onOpen}>
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
            {story.summary && <p className="mt-2 line-clamp-2 text-sm leading-5 text-muted">{story.summary}</p>}
          </div>
          <ChevronRight size={18} className="mt-1 shrink-0 text-muted" />
        </div>
      </Headline>
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

      <DetailBlock title={story.sourceAccess === "metadata_only" ? "Publisher excerpt" : "What happened"} items={story.whatHappened} />
      {story.reportedDrivers.length > 0 && <DetailBlock title="Reported drivers" items={story.reportedDrivers} />}
      {story.potentialImplications.length > 0 && <DetailBlock title="Potential implications" items={story.potentialImplications} />}

      {story.relatedInstruments.length > 0 && <section className="rounded-lg border border-line bg-panel p-4">
        <p className="text-sm font-semibold">Related markets</p>
        <div className="mt-3 divide-y divide-line">
          {story.relatedInstruments.map((id) => {
            const instrument = instrumentLookup.get(id);
            return instrument ? <InstrumentRow key={id} instrument={instrument} embedded /> : null;
          })}
        </div>
      </section>}

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
        Back to Brief
      </button>

      <section className="rounded-lg border border-line bg-panel p-4">
        <div className="flex items-start gap-3">
          <CalendarDays size={20} className="mt-0.5 shrink-0 text-muted" />
          <div>
            <h2 className="text-base font-semibold">Official releases</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              {dataMode === "loading" ? "Loading official releases." : "Latest official releases · Times in Asia/Kolkata"}
            </p>
          </div>
        </div>
      </section>

      <div className="space-y-3">
        {!events.length && <EmptyState icon={CalendarDays} title={dataMode === "loading" ? "Loading releases" : "No releases available"} text="Official releases will appear when the feeds respond." />}
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

function CorrelationLearningScreen({
  stories,
  instruments,
  quotes,
  dataMode,
  onOpenStory
}: {
  stories: Story[];
  instruments: MarketInstrument[];
  quotes: MarketInstrument[];
  dataMode: DataMode;
  onOpenStory: (id: string) => void;
}) {
  const instrumentLookup = new Map<string, MarketInstrument>();
  [...instruments, ...quotes].forEach((instrument) => {
    if (!instrumentLookup.has(instrument.id)) {
      instrumentLookup.set(instrument.id, instrument);
    }
  });
  const correlations = stories
    .map((story) => ({
      story,
      instruments: relatedInstrumentIds(story).map((id) => instrumentLookup.get(id)).filter((instrument): instrument is MarketInstrument => Boolean(instrument))
    }))
    .filter((item) => item.instruments.length > 0)
    .slice(0, 6);

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-line bg-panel p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted">News and price action</p>
            <h2 className="mt-1 text-xl font-semibold leading-tight">Correlation lab</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Match reported events with trend, reversal, range, and momentum clues.
            </p>
          </div>
          <StatusPill label={dataModeLabel(dataMode)} tone={dataMode === "live" ? "default" : "warn"} />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {["Event", "Reaction", "Pattern"].map((label) => (
            <div key={label} className="rounded-md border border-line bg-panel2 px-2 py-3 text-center">
              <p className="text-xs font-semibold">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <SectionHeader title="Live correlations" />
      <div className="space-y-3">
        {!correlations.length && <EmptyState icon={LineChart} title={dataMode === "loading" ? "Loading correlations" : "No correlations available"} text="Correlations appear when news and market feeds share related instruments." />}
        {correlations.map(({ story, instruments: related }) => (
          <section key={story.id} className="rounded-lg border border-line bg-panel p-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill label={story.geography} />
              <StatusPill label={story.category} />
              <StatusPill label={story.source} tone={story.sourceAccess === "official_release" ? "default" : "warn"} />
            </div>
            <button className="mt-3 block w-full text-left text-base font-semibold leading-snug" onClick={() => onOpenStory(story.id)}>
              {story.headline}
            </button>
            <p className="mt-2 text-sm leading-6 text-muted">{story.summary || "Headline-only feed. Open the source for the full article."}</p>
            <div className="mt-4 space-y-3">
              {related.slice(0, 3).map((instrument) => (
                <PatternCorrelation key={`${story.id}-${instrument.id}`} story={story} instrument={instrument} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {!!quotes.length && (
        <>
          <SectionHeader title="Single-name practice" />
          <div className="space-y-3">
            {quotes.map((quote) => (
              <section key={quote.id} className="rounded-lg border border-line bg-panel p-4">
                <InstrumentRow instrument={quote} embedded />
                <ObservationChecklist instrument={quote} />
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PatternCorrelation({ story, instrument }: { story: Story; instrument: MarketInstrument }) {
  const pattern = chartPattern(instrument);
  const driver = storyDriver(story);
  const move = instrumentMove(instrument);
  const link = story.relatedInstruments.includes(instrument.id)
    ? "Directly tagged by the news feed"
    : "Macro proxy selected from region and topic";

  return (
    <div className="rounded-md border border-line bg-panel2 p-3">
      <InstrumentRow instrument={instrument} embedded />
      <MiniChart instrument={instrument} />
      <div className="mt-3 grid gap-2">
        <ObservationRow label="Link" value={link} />
        <ObservationRow label="News lens" value={driver} />
        <ObservationRow label="Chart clue" value={pattern.label} />
        <ObservationRow label="Read together" value={`${move}. ${pattern.readTogether}`} />
      </div>
    </div>
  );
}

function ObservationChecklist({ instrument }: { instrument: MarketInstrument }) {
  const pattern = chartPattern(instrument);
  return (
    <div className="mt-3 rounded-md border border-line bg-panel2 p-3">
      <p className="text-xs font-semibold uppercase text-muted">Observe</p>
      <ul className="mt-2 space-y-2 text-sm leading-5 text-muted">
        <li>Price: {instrumentMove(instrument)}</li>
        <li>Pattern: {pattern.label}</li>
        <li>Question: did the move continue, fade, or stall after the news window?</li>
      </ul>
    </div>
  );
}

function ObservationRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[88px_1fr] gap-3 text-sm leading-5">
      <p className="text-muted">{label}</p>
      <p>{value}</p>
    </div>
  );
}

function SavedScreen({
  stories,
  savedStories,
  onOpenStory,
  onRemove
}: {
  stories: Story[];
  savedStories: AppState["savedStories"];
  onOpenStory: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const saved = savedStories
    .map((savedStory) => ({
      savedStory,
      story: savedStory.story ?? stories.find((story) => story.id === savedStory.storyId)
    }))
    .filter((item): item is { savedStory: AppState["savedStories"][number]; story: Story } => Boolean(item.story));

  if (!saved.length) {
    return (
      <EmptyState
        icon={Bookmark}
        title="No saved stories yet"
        text="Your saved articles will appear here."
      />
    );
  }

  return (
    <div className="space-y-3">
      {saved.map(({ savedStory, story }) => {
        const Headline = story.openInPublisher ? "a" : "button";
        return (
        <article key={story.id} className="rounded-lg border border-line bg-panel p-4">
          <Headline className="block w-full text-left" href={story.openInPublisher ? story.sourceUrl : undefined} target={story.openInPublisher ? "_blank" : undefined} rel={story.openInPublisher ? "noopener noreferrer" : undefined} onClick={story.openInPublisher ? undefined : () => onOpenStory(story.id)}>
            <p className="text-xs text-muted">Saved {formatDateTime(savedStory.savedAt)}</p>
            <h2 className="mt-1 text-base font-semibold leading-5">{story.headline}</h2>
            {story.summary && <p className="mt-2 text-sm leading-5 text-muted">{story.summary}</p>}
          </Headline>
          <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
            <p className="text-xs text-muted">{story.source}</p>
            <IconButton label="Remove saved story" onClick={() => onRemove(story.id)}>
              <Trash2 size={18} />
            </IconButton>
          </div>
        </article>
      ); })}
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
              Current coverage: {dataModeLabel(dataMode)}. NSE, Twelve Data and FRED provide market data. Mint, Economic Times, NYT and BBC provide news; RBI and Federal Reserve provide official releases. Quotes without a verified source show unavailable.
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
          <MetaRow label="Data fetched" value={lastFetchedAt ? formatDateTime(lastFetchedAt) : "Unavailable"} />
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
  const unavailable = isUnavailableInstrument(instrument);
  const positive = (instrument.change ?? 0) >= 0;
  const changeText =
    unavailable || instrument.change === null ? "" : instrument.kind === "yield"
      ? `${positive ? "+" : ""}${(instrument.change * 100).toFixed(0)} bp`
      : `${positive ? "+" : ""}${formatNumber(instrument.change)}${instrument.changePercent !== undefined ? ` (${positive ? "+" : ""}${instrument.changePercent.toFixed(2)}%)` : ""}`;
  const tradingViewUrl = getTradingViewUrl(instrument);

  return (
    <div className={embedded ? "py-3 first:pt-0 last:pb-0" : "px-4 py-3"}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <a
            className="inline-flex max-w-full items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline"
            href={tradingViewUrl}
            target="_blank"
            rel="noreferrer"
          >
            <span className="truncate">{instrument.name}</span>
            <ExternalLink size={13} className="shrink-0 text-muted" />
          </a>
          <p className="mt-0.5 text-xs text-muted">{instrument.symbol} · {instrument.session}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="tabular text-sm font-semibold">{unavailable || instrument.value === null ? "Unavailable" : `${formatNumber(instrument.value)} ${instrument.unit}`}</p>
          <p className={`tabular text-xs ${positive ? "text-up" : "text-down"}`}>{changeText}</p>
        </div>
      </div>
      <p className="mt-2 text-[11px] leading-4 text-muted">
        {unavailable
          ? "Unavailable · No verified source"
          : `${instrument.meta.sourceName} · ${instrument.meta.observedAt ? formatObservation(instrument.meta.observedAt) : "No observation"} · ${instrument.meta.availability === "stale" ? "Last available quote" : instrument.meta.delayLabel}`}
      </p>
    </div>
  );
}

function MiniChart({ instrument }: { instrument: MarketInstrument }) {
  if (isUnavailableInstrument(instrument) || instrument.history.length < 2) return <p className="mt-3 text-xs text-muted">Price history unavailable</p>;
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
      <svg viewBox="0 0 280 82" className="h-[82px] w-full" role="img" aria-label={`${instrument.name} daily price history`}>
        <line x1="0" y1="72" x2="280" y2="72" stroke="#26292F" strokeWidth="1" />
        <polyline points={points} fill="none" stroke={(instrument.change ?? 0) >= 0 ? "#4DAA72" : "#E46F6F"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="mt-2 flex justify-between text-[11px] text-muted">
        <span>{instrument.history[0]?.date}</span>
        <span>{instrument.history.at(-1)?.date}</span>
      </div>
    </div>
  );
}

function relatedInstrumentIds(story: Story) {
  if (story.relatedInstruments.length) {
    return story.relatedInstruments;
  }

  if (story.geography === "India") {
    return story.category === "central banks" ? ["nifty50", "usdinr"] : ["nifty50", "sensex", "usdinr"];
  }

  if (story.geography === "US") {
    return story.category === "central banks" ? ["us10y", "sp500", "nasdaq"] : ["sp500", "nasdaq", "us10y"];
  }

  return story.category === "geopolitics" ? ["brent", "gold", "usdinr"] : ["sp500", "nifty50", "brent"];
}

function storyDriver(story: Story) {
  if (story.category === "central banks") return "Rates, liquidity, and discount-rate expectations";
  if (story.category === "companies") return "Company-specific expectations versus sector sympathy";
  if (story.category === "markets") return "Positioning, breadth, and risk appetite";
  if (story.category === "geopolitics") return "Supply risk, safe-haven demand, and currency pressure";
  if (story.category === "technology") return "Growth expectations and mega-cap leadership";
  if (story.category === "policy") return "Rule changes, fiscal impulse, and compliance costs";
  return "Growth, inflation, currency, and earnings expectations";
}

function instrumentMove(instrument: MarketInstrument) {
  if (isUnavailableInstrument(instrument) || instrument.value === null || instrument.change === null) {
    return "No usable price reaction yet";
  }

  const direction = instrument.change > 0 ? "up" : instrument.change < 0 ? "down" : "flat";
  const percent = instrument.changePercent === undefined ? "" : `, ${Math.abs(instrument.changePercent).toFixed(2)}%`;
  return `${instrument.symbol} is ${direction} ${formatNumber(Math.abs(instrument.change))}${percent}`;
}

function chartPattern(instrument: MarketInstrument) {
  if (isUnavailableInstrument(instrument)) {
    return {
      label: "Unavailable",
      readTogether: "There is no verified quote to read yet, so do not infer a market reaction from this row."
    };
  }

  const history = instrument.history;
  if (history.length < 3) {
    const direction = (instrument.change ?? 0) > 0 ? "positive quote reaction" : (instrument.change ?? 0) < 0 ? "negative quote reaction" : "flat quote reaction";
    return {
      label: `No chart history, ${direction}`,
      readTogether: "Use the current quote as the first clue, then wait for follow-through before calling it a pattern."
    };
  }

  const values = history.map((point) => point.value);
  const first = values[0];
  const last = values.at(-1)!;
  const previous = values.at(-2)!;
  const high = Math.max(...values);
  const low = Math.min(...values);
  const totalMove = ((last - first) / first) * 100;
  const latestMove = ((last - previous) / previous) * 100;
  const range = ((high - low) / first) * 100;
  const nearHigh = high !== low && (high - last) / (high - low) < 0.2;
  const nearLow = high !== low && (last - low) / (high - low) < 0.2;

  if (Math.abs(totalMove) < 0.7 && range < 2) {
    return {
      label: "Tight range",
      readTogether: "The market has not strongly repriced the news yet; watch for a break above or below the range."
    };
  }

  if (totalMove > 0 && latestMove < -0.3) {
    return {
      label: "Uptrend losing momentum",
      readTogether: "The first reaction was positive, but the latest bar is fading; check whether the news was already priced in."
    };
  }

  if (totalMove < 0 && latestMove > 0.3) {
    return {
      label: "Downtrend bounce",
      readTogether: "The larger move is still weak, but the latest bar is repairing; separate relief from a real reversal."
    };
  }

  if (totalMove > 0 && nearHigh) {
    return {
      label: "Trend continuation near highs",
      readTogether: "The chart is accepting the news positively; look for higher lows after the headline impulse."
    };
  }

  if (totalMove < 0 && nearLow) {
    return {
      label: "Trend continuation near lows",
      readTogether: "The chart is still discounting the news negatively; wait for stabilization before assuming reversal."
    };
  }

  return {
    label: totalMove >= 0 ? "Choppy upward drift" : "Choppy downward drift",
    readTogether: "The direction exists, but conviction is mixed; compare the next news update with the next close."
  };
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

function getTradingViewUrl(instrument: MarketInstrument) {
  const symbolById: Record<string, string> = {
    nifty50: "NSE:NIFTY",
    sensex: "BSE:SENSEX",
    sp500: "SP:SPX",
    nasdaq: "NASDAQ:IXIC",
    gold: "OANDA:XAUUSD",
    brent: "TVC:UKOIL",
    usdinr: "FX_IDC:USDINR",
    us10y: "TVC:US10Y",
    "reliance-nse": "NSE:RELIANCE",
    "infy-nse": "NSE:INFY",
    "ba-nyse": "NYSE:BA"
  };
  const symbol = symbolById[instrument.id] ?? instrument.symbol.replaceAll("/", "");
  return `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}`;
}

function isUnavailableInstrument(instrument: MarketInstrument) {
  return (
    instrument.meta.availability === "unavailable" ||
    instrument.meta.availability === "fixture" ||
    instrument.status === "fixture" ||
    instrument.meta.sourceName.toLowerCase().includes("fixture")
  );
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

function formatObservation(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(value));
  return formatDateTime(value);
}

function resolveDataMode(statuses: Array<"unavailable" | "mixed" | "live">): DataMode {
  if (statuses.every((status) => status === "live")) {
    return "live";
  }
  if (statuses.some((status) => status === "live" || status === "mixed")) {
    return "mixed";
  }
  return "unavailable";
}

function dataModeLabel(mode: DataMode) {
  if (mode === "loading") {
    return "Loading";
  }
  if (mode === "mixed") {
    return "Partial";
  }
  if (mode === "live") {
    return "Connected";
  }
  if (mode === "error") {
    return "Unavailable";
  }
  return "Unavailable";
}
