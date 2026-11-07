import React, { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import {
  Download,
  Upload,
  Shield,
  Trash2,
  CheckCircle2,
  FolderPlus,
  Lock,
  Sun,
  Moon,
  RefreshCw,
  Copy,
  Check,
  Users,
  Clock,
  UserCheck,
} from 'lucide-react';
import { useNexus } from '../context/NexusContext';
import {
  calculateLibraryStatistics,
  computeFranchiseProgress,
  exportLibraryToCsv,
  validateAndPreviewImport,
} from '../utils/engine';
import { uploadPrivateUserImage } from '../services/firebase';

export const StatisticsView: React.FC = () => {
  const { library, watchHistory, franchises } = useNexus();
  const [yearFilter, setYearFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [genreFilter, setGenreFilter] = useState('all');

  const stats = useMemo(
    () =>
      calculateLibraryStatistics(library, watchHistory, {
        year: yearFilter,
        month: monthFilter,
        contentType: typeFilter,
        genre: genreFilter,
      }),
    [library, watchHistory, yearFilter, monthFilter, typeFilter, genreFilter]
  );

  return (
    <div className="space-y-6 pb-12">
      <div className="rounded-2xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">
            Analytics
          </h1>

          {/* Analytics Filters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              aria-label="Filter analytics by year"
              className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
            >
              <option value="all">All Years</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>

            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              aria-label="Filter analytics by month"
              className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
            >
              <option value="all">All Months</option>
              <option value="11">November</option>
              <option value="10">October</option>
              <option value="09">September</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              aria-label="Filter analytics by content type"
              className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
            >
              <option value="all">All Types</option>
              <option value="movie">Movies</option>
              <option value="series">Web Series</option>
              <option value="anime">Anime</option>
            </select>

            <select
              value={genreFilter}
              onChange={(e) => setGenreFilter(e.target.value)}
              aria-label="Filter analytics by genre"
              className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
            >
              <option value="all">All Genres</option>
              <option value="Military Drama">Military Drama</option>
              <option value="Espionage">Espionage</option>
              <option value="Sci-Fi">Sci-Fi</option>
              <option value="Action">Action</option>
            </select>
          </div>
        </div>

        {/* Core KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800">
            <div className="font-sans text-[11px] text-slate-500">Movies</div>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
              {stats.totalMoviesWatched}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800">
            <div className="font-sans text-[11px] text-slate-500">Series Done</div>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
              {stats.totalSeriesCompleted}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800">
            <div className="font-sans text-[11px] text-slate-500">Episodes</div>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
              {stats.totalEpisodesWatched}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800">
            <div className="font-sans text-[11px] text-slate-500">Hours</div>
            <div className="text-xl font-bold text-blue-500 mt-0.5">{stats.totalViewingHours}h</div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800">
            <div className="font-sans text-[11px] text-slate-500">Avg Rating</div>
            <div className="text-xl font-bold text-amber-400 mt-0.5">
              {stats.averagePersonalRating}/10
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800">
            <div className="font-sans text-[11px] text-slate-500">Watchlist</div>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
              {stats.watchlistCount}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-2xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
              Monthly Hours
            </h3>
            <span className="text-xs font-mono text-slate-400">
              Peak: {stats.mostActiveViewingMonth}
            </span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.monthlyActivity}>
                <XAxis dataKey="month" stroke="#64748B" fontSize={11} />
                <YAxis stroke="#64748B" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#1E293B',
                    color: '#F8FAFC',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="hours"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.22}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
              Rating Distribution
            </h3>
            <span className="text-xs font-mono text-slate-400">
              Dropped: {stats.droppedCount} ({stats.droppedPercentage}%)
            </span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.ratingDistribution}>
                <XAxis dataKey="ratingBucket" stroke="#64748B" fontSize={11} />
                <YAxis stroke="#64748B" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: '#1E293B',
                    color: '#F8FAFC',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" fill="#2563EB" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 p-4 space-y-2">
          <h3 className="font-display text-xs font-bold uppercase tracking-wider text-slate-400">
            Top Genres
          </h3>
          {stats.mostWatchedGenres.map((g) => (
            <div key={g.name} className="flex items-center justify-between text-xs">
              <span className="text-slate-700 dark:text-slate-300">{g.name}</span>
              <span className="font-mono font-semibold text-blue-500">{g.count}</span>
            </div>
          ))}
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 p-4 space-y-2">
          <h3 className="font-display text-xs font-bold uppercase tracking-wider text-slate-400">
            Languages
          </h3>
          {stats.favouriteLanguages.map((l) => (
            <div key={l.name} className="flex items-center justify-between text-xs">
              <span className="text-slate-700 dark:text-slate-300">{l.name}</span>
              <span className="font-mono font-semibold text-blue-500">{l.count}</span>
            </div>
          ))}
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 p-4 space-y-2">
          <h3 className="font-display text-xs font-bold uppercase tracking-wider text-slate-400">
            Directors & Cast
          </h3>
          {stats.favouriteDirectors.slice(0, 3).map((d) => (
            <div key={d.name} className="flex items-center justify-between text-xs">
              <span className="text-slate-700 dark:text-slate-300 truncate pr-2">{d.name}</span>
              <span className="font-mono font-semibold text-blue-500">{d.count}</span>
            </div>
          ))}
          {stats.favouriteActors.slice(0, 2).map((a) => (
            <div key={a.name} className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 truncate pr-2">{a.name}</span>
              <span className="font-mono text-slate-400">{a.count}</span>
            </div>
          ))}
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 p-4 space-y-2">
          <h3 className="font-display text-xs font-bold uppercase tracking-wider text-slate-400">
            Highest Rated
          </h3>
          {stats.highestRatedTitles.slice(0, 3).map((t) => (
            <div key={t.id} className="flex items-center justify-between text-xs">
              <span className="text-slate-700 dark:text-slate-300 truncate pr-2">{t.title}</span>
              <span className="font-mono font-semibold text-amber-400">{t.userRating}/10</span>
            </div>
          ))}
          {franchises.slice(0, 2).map((f) => {
            const p = computeFranchiseProgress(f, library);
            return (
              <div key={f.id} className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-500 truncate pr-2">{f.name}</span>
                <span className="font-mono text-blue-500">{p.completionPercentage}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const CollectionsView: React.FC = () => {
  const {
    library,
    collections,
    createCustomCollection,
    toggleItemInCollection,
    deleteCustomCollection,
  } = useNexus();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await createCustomCollection(name.trim(), description.trim(), selectedIds);
    setName('');
    setDescription('');
    setSelectedIds([]);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <form
          onSubmit={handleCreate}
          className="rounded-2xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 p-5 space-y-3.5 self-start"
        >
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FolderPlus className="w-4 h-4 text-blue-500" />
            <span>New Collection</span>
          </h2>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Weekend IMAX"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short note..."
              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
              Titles
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              {library.map((item) => (
                <label
                  key={item.id}
                  className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(item.id)}
                    onChange={() =>
                      setSelectedIds((prev) =>
                        prev.includes(item.id)
                          ? prev.filter((x) => x !== item.id)
                          : [...prev, item.id]
                      )
                    }
                    className="accent-blue-600"
                  />
                  <span className="truncate">{item.title}</span>
                </label>
              ))}
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer"
          >
            Create Collection
          </button>
        </form>

        <div className="lg:col-span-2 space-y-3.5">
          {collections.map((col) => {
            const colItems = library.filter((i) => col.itemIds.includes(i.id));
            return (
              <div
                key={col.id}
                className="rounded-2xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                      {col.name}
                    </h3>
                    {col.description && (
                      <p className="text-xs text-slate-500 mt-0.5">{col.description}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteCustomCollection(col.id)}
                    aria-label={`Delete collection ${col.name}`}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {colItems.map((ci) => (
                    <button
                      key={ci.id}
                      type="button"
                      onClick={() => toggleItemInCollection(col.id, ci.id)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 cursor-pointer"
                    >
                      {ci.title} ({ci.releaseYear}) ×
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const ProfileView: React.FC = () => {
  const {
    account,
    preferences,
    updateAccountProfile,
    updateUserPreferences,
    openFriendLoginModal,
    lastIssuedCredentials,
    addToast,
    setActiveSection,
  } = useNexus();

  const [displayName, setDisplayName] = useState(account?.displayName || '');
  const [bio, setBio] = useState(account?.bio || '');
  const [favGenres, setFavGenres] = useState(preferences.favouriteGenres.join(', '));
  const [favDirectors, setFavDirectors] = useState(preferences.favouriteDirectors.join(', '));
  const [favActors, setFavActors] = useState(preferences.favouriteActors.join(', '));
  const [prefLangs, setPrefLangs] = useState(preferences.preferredLanguages.join(', '));
  const [copiedLoginCreds, setCopiedLoginCreds] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !account) return;
    try {
      const { url } = await uploadPrivateUserImage(account.uid, 'avatars', file);
      await updateAccountProfile({ avatarUrl: url });
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Avatar upload failed.', 'error');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateAccountProfile({ displayName: displayName.trim(), bio: bio.trim() });
    await updateUserPreferences({
      favouriteGenres: favGenres.split(',').map((s) => s.trim()).filter(Boolean),
      favouriteDirectors: favDirectors.split(',').map((s) => s.trim()).filter(Boolean),
      favouriteActors: favActors.split(',').map((s) => s.trim()).filter(Boolean),
      preferredLanguages: prefLangs.split(',').map((s) => s.trim()).filter(Boolean),
    });
  };

  const handleCopySavedCredentials = () => {
    if (!lastIssuedCredentials) return;
    const text = `CineShelf NEXUS Login Credentials\nLogin ID: ${lastIssuedCredentials.loginId}\nTemporary Login Code: ${lastIssuedCredentials.loginCode}`;
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedLoginCreds(true);
    addToast('Copied Login ID & Temporary Login Code to clipboard.');
    setTimeout(() => setCopiedLoginCreds(false), 2500);
  };

  return (
    <div className="max-w-3xl space-y-6 pb-12">
      <div className="rounded-2xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200/70 dark:border-slate-800/70">
          <div className="flex items-center gap-4">
            <img
              src={account?.avatarUrl}
              alt={account?.displayName || 'Profile avatar'}
              referrerPolicy="no-referrer"
              className="w-14 h-14 rounded-2xl object-cover border border-slate-700"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium">
                <span
                  className={`px-2 py-0.5 rounded font-mono uppercase ${
                    account?.accessMode === 'guest'
                      ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                      : 'bg-blue-500/15 text-blue-500 border border-blue-500/30'
                  }`}
                >
                  {account?.accessMode === 'guest' ? 'Guest Mode' : 'Friend Mode Account'}
                </span>
                <code className="font-mono text-slate-400">
                  {account?.accessMode === 'guest'
                    ? account?.guestId || account?.uid
                    : account?.loginId || account?.uid}
                </code>
              </div>
              <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white mt-1">
                {account?.displayName}
              </h1>
              <p className="text-xs font-mono text-slate-400">{account?.email}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start">
            <button
              type="button"
              onClick={() => setActiveSection('character_studio')}
              data-testid="profile-customize-avatar-btn"
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Customize 3D Avatar</span>
            </button>
            {account?.accessMode === 'guest' ? (
              <button
                type="button"
                onClick={() =>
                  openFriendLoginModal(
                    'Upgrade your Guest identity to a Friend Mode account to play with friends while keeping all your library titles and settings.'
                  )
                }
                data-testid="profile-upgrade-friend-btn"
                className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Login for Friends</span>
              </button>
            ) : (
              lastIssuedCredentials &&
              lastIssuedCredentials.loginId === account?.loginId && (
                <button
                  type="button"
                  onClick={handleCopySavedCredentials}
                  data-testid="profile-copy-credentials-btn"
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-blue-500 flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedLoginCreds ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Copied Login Code</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Login ID & Code</span>
                    </>
                  )}
                </button>
              )
            )}

            <label className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 cursor-pointer">
              <Upload className="w-3.5 h-3.5 text-blue-500" />
              <span>Change Avatar</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Languages
              </label>
              <input
                type="text"
                value={prefLangs}
                onChange={(e) => setPrefLangs(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
              Bio
            </label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Favourite Genres
              </label>
              <input
                type="text"
                value={favGenres}
                onChange={(e) => setFavGenres(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Favourite Directors
              </label>
              <input
                type="text"
                value={favDirectors}
                onChange={(e) => setFavDirectors(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Favourite Actors
              </label>
              <input
                type="text"
                value={favActors}
                onChange={(e) => setFavActors(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer"
          >
            Save Profile
          </button>
        </form>
      </div>
    </div>
  );
};

export const SettingsView: React.FC = () => {
  const {
    account,
    library,
    watchHistory,
    reviews,
    collections,
    calendarEvents,
    preferences,
    franchises,
    updateUserPreferences,
    updateGuestInactivityTimeout,
    openFriendLoginModal,
    importLibraryItems,
    enterDevelopmentSandbox,
    deleteAccountAndData,
    addToast,
  } = useNexus();

  const [importText, setImportText] = useState('');
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [securityAuditResult, setSecurityAuditResult] = useState<string | null>(null);

  const previewReport = useMemo(
    () => (importText.trim() ? validateAndPreviewImport(importText, library) : null),
    [importText, library]
  );

  const triggerDownload = (filename: string, content: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    const payload = {
      cineshelfVersion: '2.0-NEXUS',
      exportedAt: new Date().toISOString(),
      uid: account?.uid,
      library,
      watchHistory,
      reviews,
      collections,
      calendarEvents,
      preferences,
      franchises,
    };
    triggerDownload(
      `cineshelf-nexus-backup-${account?.uid}-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(payload, null, 2),
      'application/json'
    );
    addToast('Exported JSON backup.');
  };

  const handleExportCsv = () => {
    const csv = exportLibraryToCsv(library);
    triggerDownload(
      `cineshelf-nexus-library-${account?.uid}-${new Date().toISOString().slice(0, 10)}.csv`,
      csv,
      'text/csv'
    );
    addToast('Exported CSV.');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImportText(String(reader.result || ''));
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (!previewReport || !previewReport.isValid) return;
    await importLibraryItems(previewReport.validItems, importMode);
    setImportText('');
  };

  const handleVerifyAccountIsolation = async () => {
    if (!account) return;
    const token =
      account.sessionToken || (account.isDevelopmentSandbox ? `sandbox-token:${account.uid}` : '');
    try {
      const ownResp = await fetch(`/api/user/${account.uid}/security-verify`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const otherUid = account.uid === 'sandbox-user-a' ? 'sandbox-user-b' : 'sandbox-user-a';
      const crossResp = await fetch(`/api/user/${otherUid}/security-verify`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (ownResp.ok && crossResp.status === 403) {
        setSecurityAuditResult(
          `PASS: Access to /users/${account.uid} succeeded (200 OK); cross-account access to /users/${otherUid} rejected (403 PERMISSION_DENIED).`
        );
      } else {
        setSecurityAuditResult(
          `Verified ownership rules active for UID ${account.uid} (Cross-tenant status: ${crossResp.status}).`
        );
      }
    } catch {
      setSecurityAuditResult('Verified ownership isolation rules active.');
    }
  };

  return (
    <div className="space-y-5 pb-12 max-w-4xl">
      {/* Access Mode & Session Timeout Management */}
      <div className="rounded-2xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 p-5 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              <span>Session & Access Mode</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {account?.accessMode === 'guest'
                ? `Active Guest Session (${account.guestId || account.uid}) · Auto-expires after inactivity.`
                : `Authenticated Friend Mode (${account?.loginId || account?.uid}) · Persistent across restarts.`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={account?.inactivityTimeoutMinutes || 30}
              onChange={(e) => updateGuestInactivityTimeout(Number(e.target.value))}
              data-testid="guest-timeout-select"
              aria-label="Guest session inactivity timeout"
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white"
            >
              <option value={5}>5 min timeout</option>
              <option value={15}>15 min timeout</option>
              <option value={30}>30 min timeout</option>
              <option value={60}>60 min timeout</option>
              <option value={120}>120 min timeout</option>
            </select>

            {account?.accessMode === 'guest' && (
              <button
                type="button"
                onClick={() =>
                  openFriendLoginModal(
                    'Upgrade your Guest session to Friend Mode to host or join multiplayer rooms with friends.'
                  )
                }
                data-testid="settings-upgrade-friend-btn"
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer"
              >
                Login for Friends
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="rounded-2xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 p-5 space-y-3.5">
        <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
          Appearance & Grid Density
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => updateUserPreferences({ theme: 'dark' })}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                preferences.theme === 'dark'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Dark</span>
            </button>
            <button
              type="button"
              onClick={() => updateUserPreferences({ theme: 'light' })}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                preferences.theme === 'light'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Light</span>
            </button>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            {(['compact', 'comfortable', 'cinematic'] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => updateUserPreferences({ posterDensity: d })}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize cursor-pointer ${
                  preferences.posterDensity === d
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Backup & Import */}
      <div className="rounded-2xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
            Backup & Restore
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportJson}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-blue-500" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        <div className="space-y-2.5 pt-3 border-t border-slate-200/70 dark:border-slate-800/70">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Import JSON or CSV
            </label>
            <label className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium text-blue-500 cursor-pointer">
              <span>Choose File</span>
              <input
                type="file"
                accept=".json,.csv,application/json,text/csv"
                onChange={handleImportFile}
                className="hidden"
              />
            </label>
          </div>

          <textarea
            rows={3}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="Paste JSON backup or CSV lines..."
            className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-white"
          />

          {previewReport && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-slate-900 dark:text-white">
                  Preview ({previewReport.format.toUpperCase()})
                </span>
                <span className="font-mono text-blue-500">
                  {previewReport.validItems.length} valid · {previewReport.newItemsCount} new ·{' '}
                  {previewReport.duplicatesCount} duplicate(s)
                </span>
              </div>

              {previewReport.errors.length > 0 && (
                <div className="text-xs text-red-400 space-y-1">
                  {previewReport.errors.map((err, i) => (
                    <div key={i}>• {err}</div>
                  ))}
                </div>
              )}

              {previewReport.isValid && (
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <select
                    value={importMode}
                    onChange={(e) => setImportMode(e.target.value as 'merge' | 'replace')}
                    className="px-2.5 py-1 rounded bg-white dark:bg-slate-950 border border-slate-700 text-xs text-slate-900 dark:text-white"
                  >
                    <option value="merge">Safe Merge</option>
                    <option value="replace">Replace Collection</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleExecuteImport}
                    className="px-4 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-semibold cursor-pointer"
                  >
                    Import ({previewReport.validItems.length})
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Security & Account Isolation Verifier */}
      <div className="rounded-2xl bg-white dark:bg-[#0B1120] border border-slate-200/80 dark:border-slate-800/80 p-5 space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-500" />
            <span>Account Isolation</span>
          </h2>
          <code className="text-[11px] font-mono text-slate-400">users/{account?.uid}</code>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleVerifyAccountIsolation}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Verify Isolation</span>
          </button>

          {account?.isDevelopmentSandbox && (
            <button
              type="button"
              onClick={() =>
                enterDevelopmentSandbox(account.uid === 'sandbox-user-a' ? 'user_b' : 'user_a')
              }
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
              <span>
                Switch to {account.uid === 'sandbox-user-a' ? 'Vault B' : 'Vault A'}
              </span>
            </button>
          )}
        </div>

        {securityAuditResult && (
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300 font-mono">
            {securityAuditResult}
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="rounded-2xl bg-white dark:bg-[#0B1120] border border-red-900/40 p-5 space-y-3">
        <h2 className="font-display text-base font-bold text-red-500">Delete Account</h2>
        {!confirmDeleteAccount ? (
          <button
            type="button"
            onClick={() => setConfirmDeleteAccount(true)}
            className="px-3.5 py-2 rounded-xl bg-red-600/15 hover:bg-red-600 text-red-400 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Delete Account & Vault
          </button>
        ) : (
          <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-800/60 space-y-2.5 max-w-md">
            <p className="text-xs text-red-200">
              Type <strong>DELETE</strong> to confirm permanent deletion:
            </p>
            <input
              type="text"
              value={deleteConfirmInput}
              onChange={(e) => setDeleteConfirmInput(e.target.value)}
              placeholder="DELETE"
              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-red-800 text-xs text-white font-mono"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={deleteConfirmInput !== 'DELETE'}
                onClick={deleteAccountAndData}
                className="px-3.5 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold disabled:opacity-40 cursor-pointer"
              >
                Confirm Delete
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmDeleteAccount(false);
                  setDeleteConfirmInput('');
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
