import React, { useMemo, useState } from 'react';
import {
  Layers,
  CheckCircle2,
  Clock,
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  Globe,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import { useNexus } from '../context/NexusContext';
import { computeFranchiseProgress } from '../utils/engine';
import { ContentType, StreamingRegionCode } from '../types/nexus';

export const FranchiseCentreView: React.FC = () => {
  const { catalog, library, franchises, addCatalogItemToLibrary, setSelectedItemForModal } =
    useNexus();
  const [orderById, setOrderById] = useState<Record<string, 'release' | 'chronological'>>({});

  return (
    <div className="space-y-6 pb-12">
      <div className="rounded-2xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 p-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Layers className="w-5 h-5 text-blue-500" />
          <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">
            Franchises
          </h1>
          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-xs font-mono text-slate-500">
            {franchises.length}
          </span>
        </div>
      </div>

      <div className="space-y-5">
        {franchises.map((franchise) => {
          const orderMode = orderById[franchise.id] || 'chronological';
          const progress = computeFranchiseProgress(franchise, library, orderMode);
          const sortedEntries = progress.orderedInstallments;

          return (
            <div
              key={franchise.id}
              className="rounded-2xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 p-5 space-y-4"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                    {franchise.name}
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-500">
                    <span>
                      Completed: <strong>{progress.watchedCount}/{progress.releasedCount}</strong>
                    </span>
                    <span>·</span>
                    <span className="text-blue-500">
                      Next: <strong>{progress.nextInstallmentToWatch?.title || 'All Watched'}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() =>
                        setOrderById((prev) => ({ ...prev, [franchise.id]: 'chronological' }))
                      }
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                        orderMode === 'chronological'
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Chronological
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setOrderById((prev) => ({ ...prev, [franchise.id]: 'release' }))
                      }
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                        orderMode === 'release'
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Release Order
                    </button>
                  </div>

                  <div className="w-36">
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-slate-500">Progress</span>
                      <span className="font-bold text-blue-500">
                        {progress.completionPercentage}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all"
                        style={{ width: `${progress.completionPercentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                {sortedEntries.map((entry) => {
                  const libMatch = library.find(
                    (l) =>
                      l.movieId === entry.movieId ||
                      l.title.toLowerCase() === entry.title.toLowerCase()
                  );
                  const isWatched = entry.isWatched || libMatch?.status === 'watched';
                  const isInProgress = libMatch?.status === 'currently_watching';
                  const catalogMatch = catalog.find((c) => c.movieId === entry.movieId);

                  return (
                    <div
                      key={entry.entryId || entry.movieId}
                      className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2.5 ${
                        isWatched
                          ? 'bg-emerald-950/15 border-emerald-500/40'
                          : isInProgress
                          ? 'bg-blue-950/20 border-blue-500/40'
                          : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                          <span>
                            #{orderMode === 'release' ? entry.releaseIndex : entry.chronologicalIndex} ·{' '}
                            {entry.releaseYear}
                          </span>
                          <span className="uppercase">{entry.contentType.replace('_', ' ')}</span>
                        </div>
                        <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                          {entry.title}
                        </h3>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/50 dark:border-slate-800/50">
                        {isWatched ? (
                          <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Watched
                          </span>
                        ) : isInProgress ? (
                          <span className="text-xs font-semibold text-blue-400 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            Watching
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Unwatched</span>
                        )}

                        {libMatch ? (
                          <button
                            type="button"
                            onClick={() => setSelectedItemForModal(libMatch)}
                            className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer"
                          >
                            Details
                          </button>
                        ) : catalogMatch ? (
                          <button
                            type="button"
                            onClick={() =>
                              addCatalogItemToLibrary(catalogMatch, 'want_to_watch')
                            }
                            className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-semibold cursor-pointer"
                          >
                            + Add
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const WatchCalendarView: React.FC = () => {
  const {
    calendarEvents,
    addCalendarEvent,
    toggleCalendarEventDone,
    deleteCalendarEvent,
  } = useNexus();

  const [title, setTitle] = useState('');
  const [scheduledDate, setScheduledDate] = useState('2026-11-15');
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [eventType, setEventType] = useState<
    'planned' | 'actual' | 'reminder' | 'release'
  >('planned');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await addCalendarEvent({
      title: title.trim(),
      plannedDate: scheduledDate,
      durationMinutes: Number(durationMinutes) || 120,
      eventType,
      notes: notes.trim() || 'Scheduled screening',
      completed: false,
    });
    setTitle('');
    setNotes('');
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Schedule Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 p-5 space-y-3.5 self-start"
        >
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-blue-500" />
            <span>Schedule Screening</span>
          </h2>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Dune: Part Two Rewatch"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Date
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Type
              </label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value as typeof eventType)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
              >
                <option value="planned">Planned Screening</option>
                <option value="release">Premiere Release</option>
                <option value="reminder">Rewatch Reminder</option>
                <option value="actual">Actual Log</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Duration (minutes)
            </label>
            <input
              type="number"
              min={15}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add to Calendar</span>
          </button>
        </form>

        {/* Agenda List */}
        <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 p-5 space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Scheduled Screenings
            </h2>
            <span className="text-xs font-mono text-slate-400">
              {calendarEvents.length} events
            </span>
          </div>

          <div className="space-y-2.5">
            {calendarEvents.map((ev) => (
              <div
                key={ev.id}
                className={`p-3.5 rounded-xl border flex items-center justify-between gap-4 ${
                  ev.completed
                    ? 'bg-emerald-950/10 border-emerald-500/30 opacity-75'
                    : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => toggleCalendarEventDone(ev.id)}
                    aria-label={`Mark ${ev.title} completed`}
                    className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center border cursor-pointer ${
                      ev.completed
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : 'border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {ev.completed && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </button>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-blue-500">
                      <span>{ev.plannedDate}</span>
                      <span>·</span>
                      <span className="uppercase">{ev.eventType}</span>
                    </div>
                    <h3
                      className={`font-display text-sm font-bold ${
                        ev.completed
                          ? 'line-through text-slate-400'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {ev.title}
                    </h3>
                    {ev.notes && <p className="text-xs text-slate-500 mt-0.5">{ev.notes}</p>}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => deleteCalendarEvent(ev.id)}
                  aria-label={`Delete ${ev.title}`}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const StreamingCentreView: React.FC = () => {
  const { catalog, library, preferences, updateUserPreferences, setSelectedItemForModal } =
    useNexus();
  const [availabilityFilter, setAvailabilityFilter] = useState<
    'all' | 'available' | 'unavailable' | 'unknown'
  >('all');

  const regions: { code: StreamingRegionCode; name: string }[] = [
    { code: 'IN', name: 'India (IN)' },
    { code: 'US', name: 'United States (US)' },
    { code: 'GB', name: 'United Kingdom (GB)' },
    { code: 'CA', name: 'Canada (CA)' },
    { code: 'AU', name: 'Australia (AU)' },
    { code: 'JP', name: 'Japan (JP)' },
  ];

  const itemsWithRegionState = useMemo(() => {
    return library
      .filter((i) => i.status !== 'hidden')
      .map((item) => {
        const catalogRef = catalog.find((c) => c.movieId === item.movieId);
        const regional =
          item.streamingByRegion?.[preferences.region] ||
          catalogRef?.streamingByRegion?.[preferences.region] || {
            region: preferences.region,
            state: 'unknown' as const,
            providers: [],
            lastChecked: '2026-11-01',
          };
        return { item, regional };
      })
      .filter((row) =>
        availabilityFilter === 'all' ? true : row.regional.state === availabilityFilter
      );
  }, [catalog, library, preferences.region, availabilityFilter]);

  return (
    <div className="space-y-5 pb-12">
      <div className="rounded-2xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Globe className="w-5 h-5 text-blue-500" />
            <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              Streaming Availability
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="region-select" className="text-xs font-medium text-slate-500">
              Region:
            </label>
            <select
              id="region-select"
              value={preferences.region}
              onChange={(e) =>
                updateUserPreferences({ region: e.target.value as StreamingRegionCode })
              }
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
            >
              {regions.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'all', label: 'All Titles' },
                { id: 'available', label: 'Available' },
                { id: 'unavailable', label: 'Unavailable' },
                { id: 'unknown', label: 'Unknown' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setAvailabilityFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                  availabilityFilter === f.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-amber-400">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Availability varies by region and licensing window.</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {itemsWithRegionState.map(({ item, regional }) => (
          <div
            key={item.id}
            className="rounded-2xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 p-4 flex flex-col justify-between gap-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-mono text-slate-400">
                  {item.releaseYear} · {item.contentType.toUpperCase()}
                </div>
                <h3
                  onClick={() => setSelectedItemForModal(item)}
                  className="font-display text-base font-bold text-slate-900 dark:text-white cursor-pointer hover:text-blue-500"
                >
                  {item.title}
                </h3>
              </div>

              <span
                className={`px-2.5 py-0.5 rounded-md text-[11px] font-mono font-semibold ${
                  regional.state === 'available'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : regional.state === 'unavailable'
                    ? 'bg-slate-800 text-slate-400'
                    : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                }`}
              >
                {regional.state === 'available' && `Available (${preferences.region})`}
                {regional.state === 'unavailable' && `Unavailable (${preferences.region})`}
                {regional.state === 'unknown' && `Unknown (${preferences.region})`}
              </span>
            </div>

            {regional.state === 'available' && regional.providers.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {regional.providers.map((p, idx) => (
                  <a
                    key={idx}
                    href={p.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 text-xs font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5"
                  >
                    <span>{p.providerName}</span>
                    <span className="text-[10px] font-mono uppercase text-blue-500">
                      ({p.monetizationType})
                    </span>
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                {regional.state === 'unavailable'
                  ? `No active streaming license reported in ${preferences.region}.`
                  : `Regional provider data not yet indexed for ${preferences.region}.`}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
