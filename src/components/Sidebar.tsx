import React from 'react';
import {
  Wand2,
  Video,
  Mic,
  Compass,
  FolderKanban,
  History,
  Heart,
  Settings,
  ShieldCheck,
  Sparkles,
  LogOut,
  Layers
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
  | 'settings'
  | 'admin';

interface SidebarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
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
