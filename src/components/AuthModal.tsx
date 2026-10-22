import React, { useState } from 'react';
import { X, Sparkles, Mail, Lock, User as UserIcon, LogIn, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  notify: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, notify }) => {
  const { loginWithGoogle, loginWithEmail, signupWithEmail, switchDemoUser } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  if (!isOpen) return null;

  const checkEmailRealness = (val: string): boolean => {
    const trimmed = val.trim().toLowerCase();
    const disposableDomains = [
      'tempmail.com', 'temp-mail.org', '10minutemail.com', 'guerrillamail.com',
      'sharklasers.com', 'mailinator.com', 'throwawaymail.com', 'yopmail.com',
      'fakeinbox.com', 'getnada.com', 'dispostable.com', 'trashmail.com',
      'inboxkitten.com', 'mohmal.com', 'burnermail.io', 'dropmail.me'
    ];

    if (!trimmed.includes('@')) {
      setEmailError(null);
      return true;
    }

    const domain = trimmed.split('@')[1];
    if (disposableDomains.some(d => domain.includes(d)) || domain.includes('disposable') || domain.includes('temp') || domain.includes('throwaway')) {
      setEmailError('Temporary or disposable email addresses are not permitted. Please use your genuine Google, iCloud, Outlook, Yahoo, or work email.');
      return false;
    }

    setEmailError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    if (!checkEmailRealness(email)) {
      notify('error', 'Disposable email addresses are blocked. Please use your permanent real email address.');
      return;
    }

    setSubmitting(true);
    try {
      if (isSignUp) {
        await signupWithEmail(email, password, displayName || email.split('@')[0]);
        notify('success', 'Account created! 50 starter credits added.', 'Welcome to KANTHI AI');
      } else {
        await loginWithEmail(email, password);
        notify('success', 'Signed in successfully', 'Welcome Back');
      }
      onClose();
    } catch (err: any) {
      notify('error', err.message || 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setSubmitting(true);
    try {
      await loginWithGoogle();
      notify('success', 'Signed in with Google', 'Authentication Verified');
      onClose();
    } catch (err: any) {
      // Silent when the user simply closed the popup — no scary error.
      if (err?.message !== 'Google sign-in was cancelled.') {
        notify('error', err.message || 'Google sign-in failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="max-w-md w-full bg-[#10131C] border border-[#23293D] rounded-3xl p-6 sm:p-8 shadow-2xl relative space-y-6"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-white p-2 rounded-xl bg-white/5 hover:bg-white/10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-2">
          {/* Logo Symbol */}
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-cyan-400 p-[1.5px] mx-auto shadow-lg shadow-purple-500/20">
            <div className="w-full h-full bg-[#08090C] rounded-[14px] flex items-center justify-center">
              <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-tr from-purple-400 to-cyan-300 text-2xl font-display">
                K
              </span>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-white font-display">
            {isSignUp ? 'Create KANTHI AI Account' : 'Welcome to KANTHI AI'}
          </h2>
          <p className="text-xs text-gray-400">
            {isSignUp
              ? 'Join today and receive 50 complimentary generation credits.'
              : 'Sign in to access your models, projects, and saved visuals.'}
          </p>
        </div>

        {/* Google One-Click Button */}
        <button
          onClick={handleGoogleSignIn}
          disabled={submitting}
          className="w-full py-3 px-4 rounded-xl bg-[#161A28] hover:bg-[#1E2336] border border-[#262C40] text-white text-xs font-bold flex items-center justify-center gap-3 transition-all hover:border-purple-500/40"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        <div className="flex items-center gap-3 text-xs text-gray-500">
          <div className="flex-1 h-[1px] bg-white/10" />
          <span>or continue with email</span>
          <div className="flex-1 h-[1px] bg-white/10" />
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {isSignUp && (
            <div>
              <label className="text-[11px] font-bold uppercase text-gray-400 block mb-1">
                Display Name
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Creative Name"
                  className="w-full pl-9 pr-3 py-2.5 bg-[#0B0D14] text-xs text-white rounded-xl border border-[#1F2536] focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-[11px] font-bold uppercase text-gray-400 block mb-1">
              Real Email Address (No Disposable/Temporary Emails)
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  checkEmailRealness(e.target.value);
                }}
                placeholder="you@gmail.com, you@company.com"
                className={`w-full pl-9 pr-3 py-2.5 bg-[#0B0D14] text-xs text-white rounded-xl border focus:outline-none transition-colors ${
                  emailError ? 'border-rose-500 focus:border-rose-400' : 'border-[#1F2536] focus:border-purple-500'
                }`}
              />
            </div>
            {emailError && (
              <p className="text-[10px] text-rose-400 mt-1.5 leading-tight">{emailError}</p>
            )}
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase text-gray-400 block mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 bg-[#0B0D14] text-xs text-white rounded-xl border border-[#1F2536] focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-bold transition-all shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>{isSignUp ? 'Create Free Account' : 'Sign In'}</span>
          </button>
        </form>

        <div className="text-center text-xs text-gray-400">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-purple-400 hover:underline font-semibold"
          >
            {isSignUp ? 'Sign in instead' : 'Create an account'}
          </button>
        </div>

      </div>
    </div>
  );
};
