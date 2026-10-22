import { apiFetch } from '../api';
import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  Zap,
  CreditCard,
  Shield,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { CreditTransaction } from '../types';

interface SettingsViewProps {
  onOpenPricing: () => void;
  notify: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onOpenPricing, notify }) => {
  const { user, refreshCredits, logout } = useAuth();
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loadingTx, setLoadingTx] = useState(true);
  const [copiedUid, setCopiedUid] = useState(false);
  const [serverHealth, setServerHealth] = useState<any>(null);

  useEffect(() => {
    if (user) {
      setLoadingTx(true);
      apiFetch('/api/user/credits', {
        headers: {}
      })
        .then(res => res.json())
        .then(data => {
          if (data.transactions) setTransactions(data.transactions);
        })
        .finally(() => setLoadingTx(false));
    }

    apiFetch('/api/health')
      .then(r => r.json())
      .then(d => setServerHealth(d))
      .catch(() => {});
  }, [user]);

  const copyUid = () => {
    if (!user) return;
    navigator.clipboard.writeText(user.uid);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
    notify('info', 'User ID copied to clipboard');
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-[#1C202C] pb-5">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
          Account & Preferences
        </h1>
        <p className="text-xs sm:text-sm text-gray-400 mt-1">
          Manage your creative profile, credit ledger, and connected services
        </p>
      </div>

      {/* Profile Overview Card */}
      <div className="p-6 rounded-3xl bg-[#10131C] border border-[#1F2536] flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-xl">
        <div className="flex items-center gap-4">
          <img
            src={user?.photoURL || `https://api.dicebear.com/7.x/shapes/svg?seed=${user?.uid || 'user'}`}
            alt={user?.displayName}
            className="w-16 h-16 rounded-2xl border-2 border-purple-500/40 object-cover"
          />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">{user?.displayName || 'Creator'}</h2>
              <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {user?.plan || 'Free'} Plan
              </span>
            </div>
            <div className="text-xs text-gray-400 mt-0.5">{user?.email}</div>

            <div className="flex items-center gap-2 mt-2 text-[11px] text-gray-500">
              <span>UID:</span>
              <span className="font-mono">{user?.uid}</span>
              <button onClick={copyUid} className="hover:text-white">
                {copiedUid ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenPricing}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-bold shadow-lg transition-all"
          >
            Manage Plan & Credits
          </button>
          <button
            onClick={logout}
            className="px-4 py-2.5 rounded-xl bg-[#181C28] hover:bg-rose-500/10 text-gray-400 hover:text-rose-400 border border-[#242A3D] text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Credit Status & Ledger */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-[#10131C] border border-[#1F2536] space-y-1">
          <span className="text-xs text-gray-400">Available Credits</span>
          <div className="text-3xl font-black text-amber-400 font-display flex items-center gap-2">
            <Zap className="w-6 h-6 fill-amber-400" />
            <span>{user?.role === 'admin' ? 'Unlimited' : (user?.credits ?? 0)}</span>
          </div>
          <span className="text-[11px] text-gray-500 block pt-1">
            {user?.role === 'admin' ? '👑 Admin Exemption: 0 credits deducted across all AI engines' : 'Recharge anytime with Razorpay'}
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-[#10131C] border border-[#1F2536] space-y-1">
          <span className="text-xs text-gray-400">Account Role</span>
          <div className="text-xl font-bold text-white uppercase tracking-wider font-display">
            {user?.role || 'user'}
          </div>
          <span className="text-[11px] text-purple-400 block pt-1">
            {user?.role === 'admin' ? 'Full platform administration & Unlimited Studio' : 'Standard creator account'}
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-[#10131C] border border-[#1F2536] space-y-1">
          <span className="text-xs text-gray-400">Created At</span>
          <div className="text-sm font-semibold text-white">
            {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Active session'}
          </div>
          <span className="text-[11px] text-gray-500 block pt-1">Cloud synchronized</span>
        </div>
      </div>

      {/* Cross-Platform Support for iOS, iPad & Desktop */}
      <div className="p-6 rounded-3xl bg-[#10131C] border border-[#1F2536] space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Cross-Platform Ready: iOS, iPad & Desktop</span>
          </h3>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
            PWA Standalone Enabled
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-4 rounded-2xl bg-[#0B0D14] border border-[#1C202E] space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-gray-200">
              <span className="text-base">📱</span>
              <span>Apple iPhone (iOS)</span>
            </div>
            <p className="text-[11px] text-gray-400">
              Open in Safari, tap <strong className="text-gray-200">Share</strong> → <strong className="text-gray-200">"Add to Home Screen"</strong> for a native fullscreen app experience with safe-area notch support.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#0B0D14] border border-[#1C202E] space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-gray-200">
              <span className="text-base">📲</span>
              <span>Apple iPadOS</span>
            </div>
            <p className="text-[11px] text-gray-400">
              Optimized for Split View, Stage Manager, touch gestures, and pencil interaction. Native aspect ratio grids adapt to portrait & landscape.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#0B0D14] border border-[#1C202E] space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-gray-200">
              <span className="text-base">💻</span>
              <span>Desktop (Mac, PC, Linux)</span>
            </div>
            <p className="text-[11px] text-gray-400">
              Click the install icon in Chrome/Brave/Edge URL bar for a standalone desktop window, complete with drag-and-drop project folders and keyboard shortcuts.
            </p>
          </div>
        </div>
      </div>

      {/* Platform Backend Health & Integration Status */}
      <div className="p-6 rounded-3xl bg-[#10131C] border border-[#1F2536] space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-purple-400" />
          <span>Platform & Engine Telemetry</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-[#0B0D14] border border-[#1C202E] flex items-center justify-between">
            <span className="text-gray-300">Google Gemini AI Engine</span>
            {serverHealth?.geminiConfigured ? (
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4" /> Operational
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                <AlertCircle className="w-4 h-4" /> Configured via Env
              </span>
            )}
          </div>

          <div className="p-3.5 rounded-xl bg-[#0B0D14] border border-[#1C202E] flex items-center justify-between">
            <span className="text-gray-300">Razorpay Payment Gateway</span>
            {serverHealth?.razorpayConfigured ? (
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4" /> Live in INR
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-gray-400 font-semibold">
                Ready for credentials
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Credit Accounting Audit Ledger */}
      <div className="rounded-3xl p-6 bg-[#10131C] border border-[#1F2536] space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>Credit Transaction Ledger (Server-Audited)</span>
          </h3>
          <button
            onClick={() => {
              refreshCredits();
              notify('info', 'Ledger refreshed');
            }}
            className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        {loadingTx ? (
          <div className="py-8 text-center text-xs text-gray-500">Loading audit records...</div>
        ) : transactions.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-500">
            No credit transactions recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#1F2536] text-gray-500 uppercase text-[10px]">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Reason</th>
                  <th className="py-2.5 px-3">Change</th>
                  <th className="py-2.5 px-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#181C26]">
                {transactions.map(tx => (
                  <tr key={tx.transactionId} className="hover:bg-white/[0.02]">
                    <td className="py-2.5 px-3 text-gray-400 font-mono text-[11px]">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="uppercase text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/5 text-gray-300">
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-gray-200">{tx.reason}</td>
                    <td
                      className={`py-2.5 px-3 font-bold font-mono ${
                        tx.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-gray-300">
                      {tx.balanceAfter}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
