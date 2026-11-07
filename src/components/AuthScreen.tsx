import React, { useState, useEffect } from 'react';
import {
  Film,
  KeyRound,
  Copy,
  Check,
  Sparkles,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  Users,
  Zap,
  X,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Mail,
  Lock,
} from 'lucide-react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  mapFirebaseAuthError,
} from '../services/firebase';
import { useNexus } from '../context/NexusContext';

/**
 * Modal for seamless Guest -> Friend Mode login or viewing newly issued Login ID & Temporary Login Code
 * without reloading the page or losing any Guest progress.
 */
export const FriendLoginModal: React.FC = () => {
  const {
    account,
    isFriendLoginModalOpen,
    friendLoginPromptReason,
    closeFriendLoginModal,
    loginWithDisplayName,
    loginWithExistingCode,
    lastIssuedCredentials,
  } = useNexus();

  const [tab, setTab] = useState<'create' | 'verify'>('create');
  const [displayName, setDisplayName] = useState(
    account?.displayName && !account.displayName.startsWith('Guest ')
      ? account.displayName
      : ''
  );
  const [loginIdInput, setLoginIdInput] = useState('');
  const [loginCodeInput, setLoginCodeInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [issuedResult, setIssuedResult] = useState<{
    loginId: string;
    loginCode: string;
    displayName: string;
  } | null>(null);
  const [copiedCreds, setCopiedCreds] = useState(false);

  useEffect(() => {
    if (isFriendLoginModalOpen) {
      setErrorMsg(null);
      if (
        account?.accessMode === 'friend' &&
        lastIssuedCredentials &&
        lastIssuedCredentials.loginId === account.loginId
      ) {
        setIssuedResult({
          loginId: lastIssuedCredentials.loginId,
          loginCode: lastIssuedCredentials.loginCode,
          displayName: lastIssuedCredentials.displayName,
        });
      } else {
        setIssuedResult(null);
      }
      if (account?.displayName) {
        setDisplayName(account.displayName);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFriendLoginModalOpen]);

  if (!isFriendLoginModalOpen) return null;

  const handleCreateTemporaryLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const cleanName = displayName.trim() || account?.displayName || 'Cinephile';
    setBusy(true);
    try {
      const res = await loginWithDisplayName(cleanName);
      if (!res) {
        setErrorMsg('Could not create temporary login credentials.');
        return;
      }
      setIssuedResult({
        loginId: res.loginId,
        loginCode: res.loginCode,
        displayName: res.account.displayName,
      });
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyExistingCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!loginIdInput.trim() || !loginCodeInput.trim()) {
      setErrorMsg('Enter both your Login ID (e.g. NXID-XXXX-XXXX) and Temporary Login Code.');
      return;
    }
    setBusy(true);
    try {
      const acc = await loginWithExistingCode(loginIdInput, loginCodeInput);
      if (!acc) {
        setErrorMsg('Invalid Login ID or Temporary Login Code.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleCopyCredentials = (loginId: string, loginCode: string) => {
    const text = `CineShelf NEXUS Login Credentials\nLogin ID: ${loginId}\nTemporary Login Code: ${loginCode}`;
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedCreds(true);
    setTimeout(() => setCopiedCreds(false), 2500);
  };

  return (
    <div
      data-testid="friend-login-modal"
      className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none"
    >
      <div className="w-full max-w-md rounded-2xl bg-[#0B1120] border border-slate-800 shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display text-sm font-bold text-white">
                {issuedResult ? 'Friend Mode Unlocked' : 'Login to Play with Friends'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {account?.accessMode === 'guest'
                  ? `Upgrading ${account.guestId || 'Guest'} · Progress preserved`
                  : 'Passwordless multi-device login'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeFriendLoginModal}
            data-testid="close-friend-login-modal-btn"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            aria-label="Close login modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {issuedResult ? (
            <div data-testid="issued-credentials-card" className="space-y-4">
              <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 flex items-start gap-2.5 text-xs text-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-white">{issuedResult.displayName}</span> is now
                  in <span className="font-semibold text-emerald-300">Friend Mode</span>. Your
                  current library, settings, and 3D theatre session were kept intact.
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400">
                    Personal Login Credentials (Not a Room Code)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-blue-500/15 text-[10px] font-mono text-blue-300">
                    Multi-Device
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-400">Login ID</span>
                    <code
                      data-testid="issued-login-id"
                      className="text-xs font-mono font-bold text-white tracking-wider"
                    >
                      {issuedResult.loginId}
                    </code>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-400">Temporary Login Code</span>
                    <code
                      data-testid="issued-login-code"
                      className="text-xs font-mono font-bold text-amber-400 tracking-widest"
                    >
                      {issuedResult.loginCode}
                    </code>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Save these credentials to sign back in on another browser or device. Keep your{' '}
                  <strong className="text-slate-200">Login Code</strong> private — use the separate{' '}
                  <strong className="text-blue-300">Room Invite Code</strong> to invite friends to a
                  theatre.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    handleCopyCredentials(issuedResult.loginId, issuedResult.loginCode)
                  }
                  data-testid="copy-login-credentials-btn"
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  {copiedCreds ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied Login ID & Code!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-blue-400" />
                      <span>Copy Login Credentials</span>
                    </>
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={closeFriendLoginModal}
                data-testid="continue-after-friend-login-btn"
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition cursor-pointer"
              >
                Continue to Friend Mode
              </button>
            </div>
          ) : (
            <>
              <p className="text-xs text-slate-300 leading-relaxed">{friendLoginPromptReason}</p>

              {/* Mode Tabs */}
              <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setTab('create');
                    setErrorMsg(null);
                  }}
                  data-testid="modal-tab-create-login"
                  className={`py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                    tab === 'create' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  New Login ID
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTab('verify');
                    setErrorMsg(null);
                  }}
                  data-testid="modal-tab-existing-login"
                  className={`py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                    tab === 'verify' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Use Login ID & Code
                </button>
              </div>

              {errorMsg && (
                <div
                  role="alert"
                  className="p-2.5 rounded-xl bg-red-950/50 border border-red-800/70 text-xs text-red-200 flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {tab === 'create' ? (
                <form onSubmit={handleCreateTemporaryLogin} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Display Name
                    </label>
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      data-testid="modal-friend-display-name-input"
                      placeholder="Enter your display name"
                      maxLength={32}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={busy}
                    data-testid="modal-generate-friend-login-btn"
                    className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>
                      {busy ? 'Generating...' : 'Generate Login ID & Temporary Code'}
                    </span>
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyExistingCode} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Login ID
                    </label>
                    <input
                      type="text"
                      required
                      value={loginIdInput}
                      onChange={(e) => setLoginIdInput(e.target.value.toUpperCase())}
                      data-testid="modal-login-id-input"
                      placeholder="NXID-XXXX-XXXX"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono uppercase text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Temporary Login Code
                    </label>
                    <input
                      type="text"
                      required
                      value={loginCodeInput}
                      onChange={(e) => setLoginCodeInput(e.target.value.toUpperCase())}
                      data-testid="modal-login-code-input"
                      placeholder="XXXX-XXXX"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono uppercase text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={busy}
                    data-testid="modal-verify-friend-login-btn"
                    className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{busy ? 'Verifying...' : 'Sign In with Login Code'}</span>
                  </button>
                </form>
              )}

              {lastIssuedCredentials && tab === 'verify' && (
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-[11px]">
                  <div className="text-slate-400">
                    Saved on this browser:{' '}
                    <code className="text-blue-300 font-mono">{lastIssuedCredentials.loginId}</code>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginIdInput(lastIssuedCredentials.loginId);
                      setLoginCodeInput(lastIssuedCredentials.loginCode);
                    }}
                    className="text-blue-400 hover:underline font-medium cursor-pointer"
                  >
                    Auto-fill
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export const AuthScreen: React.FC = () => {
  const {
    continueAsGuest,
    loginWithDisplayName,
    loginWithExistingCode,
    enterDevelopmentSandbox,
    openFriendLoginModal,
    lastIssuedCredentials,
  } = useNexus();

  const [guestNameInput, setGuestNameInput] = useState('');
  const [friendTab, setFriendTab] = useState<'new_login' | 'existing_code'>('new_login');
  const [friendNameInput, setFriendNameInput] = useState('');
  const [loginIdInput, setLoginIdInput] = useState('');
  const [loginCodeInput, setLoginCodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showCloudOptions, setShowCloudOptions] = useState(false);

  // Optional Cloud Email/Google Auth state
  const [cloudMode, setCloudMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleGuestStart = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    try {
      await continueAsGuest(guestNameInput.trim() || undefined);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFriendLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!friendNameInput.trim()) {
      setErrorMsg('Enter a display name to generate your Login ID and code.');
      return;
    }
    setLoading(true);
    try {
      const res = await loginWithDisplayName(friendNameInput.trim());
      if (!res) {
        setErrorMsg('Unable to generate temporary login credentials.');
        return;
      }
      openFriendLoginModal('Your Friend Mode Login ID & Temporary Login Code are ready to copy.');
    } finally {
      setLoading(false);
    }
  };

  const handleExistingCodeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!loginIdInput.trim() || !loginCodeInput.trim()) {
      setErrorMsg('Enter both your Login ID and Temporary Login Code.');
      return;
    }
    setLoading(true);
    try {
      const acc = await loginWithExistingCode(loginIdInput.trim(), loginCodeInput.trim());
      if (!acc) {
        setErrorMsg('Invalid Login ID or Temporary Login Code.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setErrorMsg(mapFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    try {
      if (cloudMode === 'login') {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (friendNameInput.trim() && cred.user) {
          await updateProfile(cred.user, { displayName: friendNameInput.trim() });
        }
      }
    } catch (err) {
      setErrorMsg(mapFirebaseAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-4xl rounded-3xl bg-[#0B1120] border border-slate-800/90 shadow-2xl overflow-hidden">
        {/* Compact Brand Header */}
        <div className="px-6 sm:px-8 py-5 bg-gradient-to-r from-slate-900 via-[#0B1120] to-slate-900 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/25">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <div className="font-display text-base font-bold tracking-tight text-white">
                CineShelf <span className="text-blue-400">NEXUS</span>
              </div>
              <div className="text-[11px] text-slate-400">
                Personal Cinema Vault & Landscape 3D Multiplayer Theatre
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
            <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-emerald-400">
              No Registration Required
            </span>
          </div>
        </div>

        {errorMsg && (
          <div className="mx-6 sm:mx-8 mt-5 p-3 rounded-xl bg-red-950/50 border border-red-800/70 text-xs text-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Two Primary Access Modes Grid */}
        <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* MODE A: CONTINUE AS GUEST (INSTANT ENTRY) */}
          <div className="lg:col-span-5 rounded-2xl bg-slate-900/70 border border-slate-800/90 p-5 flex flex-col justify-between space-y-5">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono uppercase tracking-wider">
                <Zap className="w-3 h-3" />
                <span>Instant Access · Guest Mode</span>
              </div>

              <h1 className="font-display text-xl font-bold text-white tracking-tight">
                Continue as Guest
              </h1>
              <p className="text-xs text-slate-400 leading-relaxed">
                Enter immediately with an automatic temporary Guest ID. Explore all features, manage
                your library, and test the 3D cinema with AI bots.
              </p>

              <div className="space-y-1.5 pt-1 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Full website, library & episode tracking</span>
                </div>
                <div className="flex items-center gap-2">
                  <Film className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>3D Theatre movement, snacks & AI Bot screenings</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Upgrade to Friend Mode anytime without losing progress</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleGuestStart} className="space-y-2.5 pt-2 border-t border-slate-800/80">
              <input
                type="text"
                value={guestNameInput}
                onChange={(e) => setGuestNameInput(e.target.value)}
                data-testid="guest-display-name-input"
                placeholder="Optional nickname (or leave blank)"
                maxLength={28}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={loading}
                data-testid="continue-as-guest-btn"
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                <span>{loading ? 'Entering...' : 'Continue as Guest'}</span>
              </button>
            </form>
          </div>

          {/* MODE B: LOGIN TO PLAY WITH FRIENDS (TEMPORARY PASSWORDLESS LOGIN) */}
          <div className="lg:col-span-7 rounded-2xl bg-slate-900/70 border border-slate-800/90 p-5 flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-500/15 border border-blue-500/30 text-blue-300 text-[10px] font-mono uppercase tracking-wider">
                    <Users className="w-3 h-3" />
                    <span>Friend Mode · Multiplayer Ready</span>
                  </div>
                  <h2 className="font-display text-xl font-bold text-white tracking-tight mt-2">
                    Login to Play with Friends
                  </h2>
                </div>

                {/* Switch between New Display Name vs Returning Login ID + Code */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setFriendTab('new_login');
                      setErrorMsg(null);
                    }}
                    data-testid="tab-new-friend-login"
                    className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                      friendTab === 'new_login'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    New Login
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFriendTab('existing_code');
                      setErrorMsg(null);
                    }}
                    data-testid="tab-existing-friend-login"
                    className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                      friendTab === 'existing_code'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Use ID & Code
                  </button>
                </div>
              </div>

              {friendTab === 'new_login' ? (
                <form onSubmit={handleCreateFriendLogin} className="space-y-3.5">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Enter a display name to generate a unique <strong className="text-slate-200">Login ID</strong> and{' '}
                    <strong className="text-slate-200">Temporary Login Code</strong> for hosting or
                    joining private friend rooms across devices.
                  </p>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Display Name
                    </label>
                    <input
                      type="text"
                      required
                      value={friendNameInput}
                      onChange={(e) => setFriendNameInput(e.target.value)}
                      data-testid="friend-login-name-input"
                      placeholder="e.g., Harshit"
                      maxLength={32}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    data-testid="create-friend-login-btn"
                    className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition cursor-pointer"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>
                      {loading ? 'Generating...' : 'Generate Login ID & Play with Friends'}
                    </span>
                  </button>
                </form>
              ) : (
                <form onSubmit={handleExistingCodeLogin} className="space-y-3">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Enter your personal <strong className="text-slate-200">Login ID</strong> and{' '}
                    <strong className="text-slate-200">Temporary Login Code</strong> to restore your
                    Friend Mode account on this device.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Login ID
                      </label>
                      <input
                        type="text"
                        required
                        value={loginIdInput}
                        onChange={(e) => setLoginIdInput(e.target.value.toUpperCase())}
                        data-testid="returning-login-id-input"
                        placeholder="NXID-XXXX-XXXX"
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono uppercase text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Temporary Login Code
                      </label>
                      <input
                        type="text"
                        required
                        value={loginCodeInput}
                        onChange={(e) => setLoginCodeInput(e.target.value.toUpperCase())}
                        data-testid="returning-login-code-input"
                        placeholder="XXXX-XXXX"
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono uppercase text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {lastIssuedCredentials && (
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">
                        Recent ID on this device:{' '}
                        <code className="text-blue-400 font-mono">
                          {lastIssuedCredentials.loginId}
                        </code>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setLoginIdInput(lastIssuedCredentials.loginId);
                          setLoginCodeInput(lastIssuedCredentials.loginCode);
                        }}
                        data-testid="autofill-saved-credentials-btn"
                        className="text-blue-400 hover:underline font-semibold cursor-pointer"
                      >
                        Fill Credentials
                      </button>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    data-testid="verify-friend-login-btn"
                    className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{loading ? 'Verifying...' : 'Sign In with Login ID & Code'}</span>
                  </button>
                </form>
              )}
            </div>

            {/* Compact Instant Sandbox Vaults & Optional Cloud Login */}
            <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                    Demo Vaults:
                  </span>
                  <button
                    type="button"
                    onClick={() => enterDevelopmentSandbox('user_a')}
                    data-testid="demo-vault-a-btn"
                    className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] font-medium text-slate-300 cursor-pointer"
                  >
                    Vault A
                  </button>
                  <button
                    type="button"
                    onClick={() => enterDevelopmentSandbox('user_b')}
                    data-testid="demo-vault-b-btn"
                    className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] font-medium text-slate-300 cursor-pointer"
                  >
                    Vault B
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCloudOptions((prev) => !prev)}
                  className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                >
                  <span>Cloud Sign-In</span>
                  {showCloudOptions ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {showCloudOptions && (
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-slate-400">
                      Firebase Cloud Sync (Optional)
                    </span>
                    <div className="flex gap-1 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setCloudMode('login')}
                        className={`px-2 py-0.5 rounded ${
                          cloudMode === 'login' ? 'bg-blue-600 text-white' : 'text-slate-400'
                        }`}
                      >
                        Sign In
                      </button>
                      <button
                        type="button"
                        onClick={() => setCloudMode('register')}
                        className={`px-2 py-0.5 rounded ${
                          cloudMode === 'register' ? 'bg-blue-600 text-white' : 'text-slate-400'
                        }`}
                      >
                        Register
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="w-full py-2 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Continue with Google</span>
                  </button>

                  <form onSubmit={handleEmailAuth} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="relative">
                      <Mail className="w-3 h-3 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email"
                        className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white"
                      />
                    </div>
                    <div className="relative">
                      <Lock className="w-3 h-3 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="py-1.5 px-3 rounded-lg bg-blue-600 text-white text-xs font-semibold cursor-pointer"
                    >
                      {cloudMode === 'login' ? 'Sign In' : 'Register'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

