import React, { useState } from 'react';
import {
  Film,
  Compass,
  Library,
  Tv,
  Sparkles,
  Layers,
  Calendar,
  PlaySquare,
  BarChart3,
  FolderHeart,
  User,
  Settings,
  LogOut,
  Plus,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  X,
  Menu,
  Users,
  Database,
  UserCheck,
} from 'lucide-react';
import { NexusProvider, useNexus } from './context/NexusContext';
import { NavigationSection } from './types/nexus';
import { AuthScreen, FriendLoginModal } from './components/AuthScreen';
import { DashboardView, DiscoverView } from './components/DashboardAndDiscoverView';
import {
  LibraryView,
  SeriesTrackerView,
  RecommendationsView,
} from './components/LibraryAndSeriesView';
import {
  FranchiseCentreView,
  WatchCalendarView,
  StreamingCentreView,
} from './components/FranchiseCalendarStreamingView';
import {
  StatisticsView,
  CollectionsView,
  ProfileView,
  SettingsView,
} from './components/AnalyticsCollectionsSettingsView';
import { AddEntryModal, TitleDetailModal } from './components/TitleModals';
import { OfflineIndicator, PWAInstallButton } from './components/PWAWidgets';
import { NexusSocialView } from './components/NexusSocialView';
import { MovieCatalogueAdminView } from './components/MovieCatalogueAdminView';
import { CharacterStudioView } from './components/CharacterStudioView';

const NAV_ITEMS: {
  id: NavigationSection;
  label: string;
  icon: React.FC<{ className?: string }>;
  group: 'core' | 'planning' | 'account';
  badge?: string;
}[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Film, group: 'core' },
  { id: 'watch_together', label: 'Watch Together', icon: Users, group: 'core', badge: '3D' },
  { id: 'character_studio', label: 'Character Studio', icon: UserCheck, group: 'core', badge: '3D' },
  { id: 'discover', label: 'Discover', icon: Compass, group: 'core' },
  { id: 'library', label: 'Library', icon: Library, group: 'core' },
  { id: 'series', label: 'Series', icon: Tv, group: 'core' },
  { id: 'recommendations', label: 'For You', icon: Sparkles, group: 'core' },
  { id: 'franchises', label: 'Franchises', icon: Layers, group: 'planning' },
  { id: 'calendar', label: 'Calendar', icon: Calendar, group: 'planning' },
  { id: 'streaming', label: 'Streaming', icon: PlaySquare, group: 'planning' },
  { id: 'statistics', label: 'Analytics', icon: BarChart3, group: 'planning' },
  { id: 'collections', label: 'Collections', icon: FolderHeart, group: 'account' },
  { id: 'admin_catalog', label: 'Catalogue Admin', icon: Database, group: 'account', badge: 'DB' },
  { id: 'profile', label: 'Profile', icon: User, group: 'account' },
  { id: 'settings', label: 'Settings', icon: Settings, group: 'account' },
];

const CineShelfShell: React.FC = () => {
  const {
    account,
    authReady,
    activeSection,
    setActiveSection,
    library,
    saveState,
    toasts,
    dismissToast,
    signOutCurrentAccount,
    enterDevelopmentSandbox,
    openFriendLoginModal,
    selectedItemForModal,
    setSelectedItemForModal,
    isAddModalOpen,
    setIsAddModalOpen,
  } = useNexus();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#070B14] text-white flex items-center justify-center">
        <div className="flex items-center gap-2.5 text-xs font-mono text-slate-400">
          <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
          <span>Loading vault...</span>
        </div>
      </div>
    );
  }

  if (!account) {
    return <AuthScreen />;
  }

  // Landscape-First Full-Viewport 3D Cinema Mode
  if (activeSection === 'watch_together') {
    return (
      <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-[#04060D] text-slate-100 select-none">
        <OfflineIndicator />
        <NexusSocialView />
        <FriendLoginModal />

        {toasts.length > 0 && (
          <div
            className="fixed bottom-4 right-4 z-[90] space-y-2 max-w-sm pointer-events-auto"
            aria-live="polite"
          >
            {toasts.map((t) => (
              <div
                key={t.id}
                className={`p-3 rounded-xl border shadow-xl flex items-center justify-between gap-3 text-xs font-medium ${
                  t.type === 'error'
                    ? 'bg-red-950/95 border-red-800 text-red-200'
                    : t.type === 'info'
                    ? 'bg-slate-900/95 border-slate-700 text-slate-200'
                    : 'bg-emerald-950/95 border-emerald-800 text-emerald-200'
                }`}
              >
                <span>{t.message}</span>
                <button
                  type="button"
                  onClick={() => dismissToast(t.id)}
                  aria-label="Dismiss notification"
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const activeNavObj = NAV_ITEMS.find((n) => n.id === activeSection) || NAV_ITEMS[0];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070B14] text-slate-900 dark:text-slate-100 flex">
      <OfflineIndicator />

      {/* Desktop Left Navigation Sidebar */}
      <aside className="hidden xl:flex xl:w-60 xl:flex-col xl:fixed xl:inset-y-0 bg-white dark:bg-[#0B1120] border-r border-slate-200/80 dark:border-slate-800/80 z-30">
        <div className="h-14 px-5 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80">
          <button
            type="button"
            onClick={() => setActiveSection('dashboard')}
            className="flex items-center gap-2.5 text-left cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <Film className="w-3.5 h-3.5" />
            </div>
            <span className="font-display text-sm font-bold tracking-tight text-slate-900 dark:text-white">
              CineShelf <span className="text-blue-500">NEXUS</span>
            </span>
          </button>
          <span className="text-[11px] font-mono text-slate-400">{library.length}</span>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto" aria-label="Main Navigation">
          {(['core', 'planning', 'account'] as const).map((groupKey) => {
            const groupLabel =
              groupKey === 'core'
                ? 'Cinema'
                : groupKey === 'planning'
                ? 'Intelligence'
                : 'Workspace';
            return (
              <div key={groupKey} className="space-y-0.5">
                <div className="px-2.5 pb-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {groupLabel}
                </div>
                {NAV_ITEMS.filter((item) => item.group === groupKey).map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveSection(item.id)}
                      data-testid={`nav-${item.id}`}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                      </span>
                      {item.badge && (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                            isActive
                              ? 'bg-white/20 text-white'
                              : 'bg-blue-500/15 text-blue-500 dark:text-blue-400'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Compact Account Footer with Guest Mode vs Friend Mode Indicator */}
        <div className="p-3 border-t border-slate-200/80 dark:border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between px-1">
            <span
              data-testid="access-mode-badge"
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                account.accessMode === 'guest'
                  ? 'bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30'
                  : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
              }`}
            >
              {account.accessMode === 'guest' ? 'Guest Mode' : 'Friend Mode'}
            </span>
            <code
              data-testid="active-identity-code"
              className="text-[10px] font-mono text-slate-500 dark:text-slate-400"
            >
              {account.accessMode === 'guest'
                ? account.guestId || account.uid
                : account.loginId || account.uid}
            </code>
          </div>

          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2 min-w-0">
              <img
                src={account.avatarUrl}
                alt={account.displayName}
                referrerPolicy="no-referrer"
                className="w-7 h-7 rounded-lg object-cover border border-slate-300 dark:border-slate-700 shrink-0"
              />
              <div className="min-w-0">
                <div
                  data-testid="active-user-name"
                  className="text-xs font-semibold text-slate-900 dark:text-white truncate"
                >
                  {account.displayName}
                </div>
                <div
                  data-testid="active-user-uid"
                  className="text-[10px] font-mono text-slate-400 truncate"
                >
                  {account.uid}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={signOutCurrentAccount}
              data-testid="logout-button"
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>

          {account.accessMode === 'guest' ? (
            <button
              type="button"
              onClick={() =>
                openFriendLoginModal(
                  'Upgrade your Guest session to Friend Mode to host or join multiplayer rooms with friends while keeping all your current progress.'
                )
              }
              data-testid="sidebar-upgrade-friend-btn"
              className="w-full py-1.5 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Login for Friends</span>
            </button>
          ) : (
            account.isDevelopmentSandbox && (
              <div className="grid grid-cols-2 gap-1 pt-0.5">
                <button
                  type="button"
                  onClick={() => enterDevelopmentSandbox('user_a')}
                  data-testid="switch-user-a"
                  className={`py-1 px-2 rounded text-[10px] font-mono font-medium cursor-pointer transition ${
                    account.uid === 'sandbox-user-a'
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40'
                      : 'bg-slate-100 dark:bg-slate-900 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Vault A
                </button>
                <button
                  type="button"
                  onClick={() => enterDevelopmentSandbox('user_b')}
                  data-testid="switch-user-b"
                  className={`py-1 px-2 rounded text-[10px] font-mono font-medium cursor-pointer transition ${
                    account.uid === 'sandbox-user-b'
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40'
                      : 'bg-slate-100 dark:bg-slate-900 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Vault B
                </button>
              </div>
            )
          )}
        </div>
      </aside>

      {/* Main Content Column */}
      <div className="flex-1 xl:pl-60 flex flex-col min-w-0">
        {/* Minimal Sticky Header */}
        <header className="sticky top-0 z-20 h-14 bg-white/85 dark:bg-[#070B14]/85 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 sm:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="xl:hidden p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-white tracking-tight">
              {activeNavObj.label}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Subtle Sync Pill */}
            <div
              data-testid="save-state-indicator"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-[11px] font-mono text-slate-500 dark:text-slate-400"
            >
              {saveState === 'saving' && (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin text-blue-500" />
                  <span>Syncing</span>
                </>
              )}
              {saveState === 'saved' && (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span>Saved</span>
                </>
              )}
              {saveState === 'error' && (
                <>
                  <AlertCircle className="w-3 h-3 text-red-500" />
                  <span>Sync Error</span>
                </>
              )}
              {saveState === 'idle' && (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Synced</span>
                </>
              )}
            </div>

            <PWAInstallButton />

            {account.accessMode === 'guest' ? (
              <button
                type="button"
                onClick={() =>
                  openFriendLoginModal(
                    'Log in with a display name or temporary login code to play with friends.'
                  )
                }
                data-testid="header-upgrade-friend-btn"
                className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Guest Mode active — Click to Login for Friends"
              >
                <Users className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{account.guestId || 'Guest'}</span>
                <span className="text-[10px] font-mono underline">Login</span>
              </button>
            ) : (
              <span
                data-testid="header-friend-mode-pill"
                className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/30 text-[11px] font-mono text-blue-600 dark:text-blue-300"
              >
                <Users className="w-3 h-3" />
                <span>{account.loginId || 'Friend Mode'}</span>
              </span>
            )}

            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              data-testid="top-add-title-btn"
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Title</span>
            </button>
          </div>
        </header>

        {/* Mobile Drawer Navigation */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 xl:hidden flex">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative w-64 max-w-[80vw] bg-white dark:bg-[#0B1120] h-full p-4 flex flex-col justify-between z-10 border-r border-slate-800">
              <div className="space-y-4 overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                  <span className="font-display font-bold text-sm text-slate-900 dark:text-white">
                    CineShelf <span className="text-blue-500">NEXUS</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    aria-label="Close navigation menu"
                    className="p-1 text-slate-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-1">
                  {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setActiveSection(item.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium ${
                          activeSection === item.id
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <Icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </span>
                        {item.badge && (
                          <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-[9px] font-mono text-blue-300">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={signOutCurrentAccount}
                className="w-full py-2 px-3 rounded-lg bg-red-600/10 text-red-400 text-xs font-semibold flex items-center justify-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out ({account.displayName})</span>
              </button>
            </div>
          </div>
        )}

        {/* Active View Content */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl w-full mx-auto">
          {activeSection === 'dashboard' && <DashboardView />}
          {activeSection === 'character_studio' && <CharacterStudioView />}
          {activeSection === 'discover' && <DiscoverView />}
          {activeSection === 'library' && <LibraryView />}
          {activeSection === 'series' && <SeriesTrackerView />}
          {activeSection === 'recommendations' && <RecommendationsView />}
          {activeSection === 'franchises' && <FranchiseCentreView />}
          {activeSection === 'calendar' && <WatchCalendarView />}
          {activeSection === 'streaming' && <StreamingCentreView />}
          {activeSection === 'statistics' && <StatisticsView />}
          {activeSection === 'collections' && <CollectionsView />}
          {activeSection === 'admin_catalog' && <MovieCatalogueAdminView />}
          {activeSection === 'profile' && <ProfileView />}
          {activeSection === 'settings' && <SettingsView />}
        </main>

        {/* Mobile Bottom Tab Bar */}
        <nav
          aria-label="Mobile Bottom Navigation"
          className="xl:hidden fixed bottom-0 inset-x-0 z-20 bg-white/95 dark:bg-[#0B1120]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 grid grid-cols-5 py-1.5 px-2"
        >
          {(
            [
              { id: 'dashboard', label: 'Home', icon: Film },
              { id: 'watch_together', label: '3D Cinema', icon: Users },
              { id: 'library', label: 'Library', icon: Library },
              { id: 'series', label: 'Series', icon: Tv },
              { id: 'recommendations', label: 'For You', icon: Sparkles },
            ] as const
          ).map((m) => {
            const Icon = m.icon;
            const active = activeSection === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setActiveSection(m.id)}
                className={`flex flex-col items-center justify-center py-1 text-[10px] font-medium cursor-pointer ${
                  active ? 'text-blue-500' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Icon className="w-4 h-4 mb-0.5" />
                <span>{m.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Modals */}
      {selectedItemForModal && (
        <TitleDetailModal
          item={selectedItemForModal}
          onClose={() => setSelectedItemForModal(null)}
        />
      )}

      {isAddModalOpen && <AddEntryModal onClose={() => setIsAddModalOpen(false)} />}

      <FriendLoginModal />

      {/* Toast Notifications */}
      {toasts.length > 0 && (
        <div
          className="fixed bottom-16 xl:bottom-5 right-5 z-50 space-y-2 max-w-sm"
          aria-live="polite"
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`p-3 rounded-xl border shadow-xl flex items-center justify-between gap-3 text-xs font-medium ${
                t.type === 'error'
                  ? 'bg-red-950/95 border-red-800 text-red-200'
                  : t.type === 'info'
                  ? 'bg-slate-900/95 border-slate-700 text-slate-200'
                  : 'bg-emerald-950/95 border-emerald-800 text-emerald-200'
              }`}
            >
              <span>{t.message}</span>
              <button
                type="button"
                onClick={() => dismissToast(t.id)}
                aria-label="Dismiss notification"
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export function App() {
  return (
    <NexusProvider>
      <CineShelfShell />
    </NexusProvider>
  );
}

export default App;
