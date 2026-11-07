import React, { useState } from 'react';
import { Download, WifiOff, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);

  if (isInstalled) return null;

  return (
    <>
      <button
        type="button"
        onClick={async () => {
          if (isInstallable) {
            await install();
          } else {
            setShowModal(true);
          }
        }}
        className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        aria-label="Install CineShelf NEXUS PWA"
      >
        <Download className="w-3.5 h-3.5 text-blue-500" />
        <span className="hidden sm:inline">Install</span>
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-title"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3
                id="pwa-install-title"
                className="text-base font-bold text-slate-900 dark:text-white"
              >
                Install App
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                aria-label="Close install instructions"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
              {isIOS ? (
                <>
                  <p>1. Tap <strong>Share</strong> in Safari.</p>
                  <p>2. Select <strong>Add to Home Screen</strong>.</p>
                </>
              ) : (
                <>
                  <p>1. Open in a top-level browser tab.</p>
                  <p>2. Click <strong>Install</strong> in the address bar.</p>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="w-full py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-16 md:bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white shadow-lg"
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>Offline Mode</span>
    </div>
  );
};
