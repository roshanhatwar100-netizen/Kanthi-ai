import React from 'react';
import {
  Wand2,
  Video,
  Mic,
  Compass,
  FolderKanban,
  History,
  Heart,
  CreditCard,
  Settings,
  ShieldCheck,
  Sparkles,
  Zap,
  LogOut,
  ChevronRight,
  Layers,
  Infinity as InfinityIcon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type TabType =
  | 'dashboard'
  | 'create'
  | 'video'
  | 'audio'
  | 'influencer'
  | 'explore'
  | 'projects'
  | 'history'
  | 'favorites'
  | 'pricing'
  | 'settings'
  | 'admin';

interface SidebarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  onOpenPricing: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab, onOpenPricing }) => {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'admin';

  const navItems = [
    { id: 'dashboard' as TabType, label: 'Dashboard', icon: Layers },
    { id: 'create' as TabType, label: 'Image Studio', icon: Wand2 },
    { id: 'video' as TabType, label: 'Video Studio', icon: Video, highlight: true },
    { id: 'audio' as TabType, label: 'Audio & Music', icon: Mic, highlight: true },
    { id: 'influencer' as TabType, label: 'AI Influencer', icon: Sparkles, highlight: true },
    { id: 'explore' as TabType, label: 'Explore', icon: Compass },
    { id: 'projects' as TabType, label: 'Projects', icon: FolderKanban },
    { id: 'history' as TabType, label: 'History', icon: History },
    { id: 'favorites' as TabType, label: 'Favorites', icon: Heart },
    { id: 'pricing' as TabType, label: 'Pricing & Plans', icon: CreditCard },
    { id: 'settings' as TabType, label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen bg-[#0C0E14] border-r border-[#1C202C] shrink-0 sticky top-0 select-none">
      {/* Brand Header */}
      <div className="p-5 flex items-center justify-between border-b border-[#1C202C]">
        <div
          onClick={() => onSelectTab('dashboard')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          {/* Original K Icon Symbol */}
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 via-pink-600 to-cyan-400 p-[1.5px] shadow-lg shadow-purple-500/20 group-hover:shadow-purple-500/40 transition-shadow">
            <div className="w-full h-full bg-[#08090C] rounded-[10px] flex items-center justify-center">
              <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-tr from-purple-400 via-pink-300 to-cyan-300 text-xl font-display tracking-tighter">
                K
              </span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-display font-extrabold tracking-wider text-white text-lg">
                KANTHI
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 text-white shadow-sm">
                AI
              </span>
            </div>
            <div className="text-[10px] text-gray-400 tracking-tight">Turn imagination into creation</div>
          </div>
        </div>
      </div>

      {/* Main Navigation Links */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-1.5 text-[11px] font-semibold tracking-wider uppercase text-gray-400">
          Creative Suites
        </div>

        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                isActive
                  ? 'bg-gradient-to-r from-purple-600/20 via-pink-600/10 to-transparent text-white border-l-2 border-purple-500'
                  : 'text-gray-300 hover:text-white hover:bg-[#141822]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-purple-400' : 'text-gray-400 group-hover:text-gray-200'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.highlight && (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  New
                </span>
              )}
            </button>
          );
        })}

        {/* Admin Navigation link */}
        {isAdmin && (
          <div className="pt-3">
            <div className="px-3 py-1.5 text-[11px] font-semibold tracking-wider uppercase text-purple-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin Panel</span>
            </div>
            <button
              onClick={() => onSelectTab('admin')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                currentTab === 'admin'
                  ? 'bg-purple-900/30 text-purple-200 border-l-2 border-purple-400'
                  : 'text-gray-300 hover:text-white hover:bg-[#141822]'
              }`}
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                <span>Control Center</span>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded border border-purple-500/30">
                ADMIN
              </span>
            </button>
          </div>
        )}
      </nav>

      {/* Credit Balance & Refill Card */}
      <div className="p-3 mx-3 mb-2 rounded-2xl bg-gradient-to-b from-[#161A26] to-[#10131C] border border-[#232838] relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-600/10 rounded-full blur-xl group-hover:bg-purple-600/20 transition-all pointer-events-none" />

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-300">
            <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>Creative Credits</span>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-white/5 text-gray-300 border border-white/10">
            {isAdmin ? 'ROOT ADMIN' : (user?.plan || 'Free')}
          </span>
        </div>

        {isAdmin ? (
          <div className="mb-2.5">
            <div className="flex items-center gap-1.5 text-purple-300">
              <InfinityIcon className="w-6 h-6 animate-pulse" />
              <span className="text-lg font-black tracking-tight">Unlimited (Admin)</span>
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">Zero credits deducted on any engine</div>
          </div>
        ) : (
          <div className="flex items-baseline gap-1 mb-2.5">
            <span className="text-2xl font-extrabold text-white tracking-tight font-display">
              {user?.credits ?? 0}
            </span>
            <span className="text-xs text-gray-400">credits left</span>
          </div>
        )}

        {isAdmin ? (
          <button
            onClick={() => onSelectTab('admin')}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 text-xs font-bold transition-all"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
            <span>Admin Control Panel</span>
          </button>
        ) : (
          <button
            onClick={onOpenPricing}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-purple-700 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-bold shadow-lg shadow-purple-600/20 transition-all active:scale-[0.98]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Refill & Upgrade</span>
            <ChevronRight className="w-3 h-3 ml-auto opacity-70" />
          </button>
        )}
      </div>

      {/* User Profile Footer */}
      <div className="p-3 border-t border-[#1C202C] bg-[#0A0C11] flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src={user?.photoURL || `https://api.dicebear.com/7.x/shapes/svg?seed=${user?.uid || 'user'}`}
            alt={user?.displayName || 'User'}
            className="w-8 h-8 rounded-full border border-purple-500/40 object-cover shrink-0"
          />
          <div className="min-w-0">
            <div className="text-xs font-semibold text-white truncate flex items-center gap-1">
              <span>{user?.displayName || 'Anonymous'}</span>
              {isAdmin && <span className="text-[9px] text-amber-400">👑</span>}
            </div>
            <div className="text-[10px] text-gray-400 truncate">{user?.email}</div>
          </div>
        </div>

        <button
          onClick={logout}
          title="Sign out"
          className="p-1.5 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
