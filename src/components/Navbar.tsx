import React from 'react';
import { Sparkles, Zap, ShieldAlert, LogIn, Menu, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { TabType } from './Sidebar';

interface NavbarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  onOpenPricing: () => void;
  onOpenAuth: () => void;
  isLanding?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenPricing,
  onOpenAuth,
  isLanding
}) => {
  const { user, switchDemoUser } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full h-16 bg-[#08090C]/85 backdrop-blur-xl border-b border-[#1C202C] px-4 md:px-6 flex items-center justify-between">
      {/* Mobile brand & desktop title */}
      <div className="flex items-center gap-3">
        <div
          onClick={() => onSelectTab(isLanding ? 'dashboard' : 'create')}
          className="flex items-center gap-2.5 cursor-pointer md:hidden"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-cyan-400 p-[1px]">
            <div className="w-full h-full bg-[#08090C] rounded-[7px] flex items-center justify-center font-display font-extrabold text-transparent bg-clip-text bg-gradient-to-tr from-purple-400 to-cyan-300 text-sm">
              K
            </div>
          </div>
          <span className="font-display font-black text-white text-base tracking-wider">
            KANTHI <span className="text-purple-400">AI</span>
          </span>
        </div>

        {/* Desktop breadcrumb or contextual indicator */}
        <div className="hidden md:flex items-center gap-2 text-sm text-gray-400">
          <span className="text-gray-300 font-medium capitalize">
            {currentTab === 'create' ? 'AI Image Studio' : currentTab}
          </span>
          <span className="text-gray-600">/</span>
          <span className="text-xs text-purple-400/80 font-mono">Gemini 3.1 & Imagen 3 Engine</span>
        </div>
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-2.5 sm:gap-4">
        {/* Credit count pill */}
        {user ? (
          user.role === 'admin' ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-950/40 border border-purple-500/40 text-purple-200 text-xs font-bold shadow-sm">
              <span className="text-amber-400 font-extrabold text-sm">∞</span>
              <span>Admin Unlimited</span>
            </div>
          ) : (
            <button
              onClick={onOpenPricing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#161B29] border border-amber-500/30 hover:border-amber-400 text-amber-300 text-xs font-bold transition-all shadow-sm"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" />
              <span>{user.credits}</span>
              <span className="text-gray-400 font-normal hidden sm:inline">credits</span>
            </button>
          )
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-200 text-xs font-bold transition-all"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        )}

        {/* Upgrade / Pricing CTA */}
        <button
          onClick={onOpenPricing}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-bold shadow-lg shadow-purple-600/20 transition-all active:scale-95"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Upgrade Plan</span>
          <span className="sm:hidden">Get Credits</span>
        </button>

        {/* Profile Avatar / Trigger */}
        {user && (
          <div
            onClick={() => onSelectTab('settings')}
            className="cursor-pointer flex items-center gap-2 p-1 rounded-full hover:bg-white/5 transition-colors"
          >
            <img
              src={user.photoURL || `https://api.dicebear.com/7.x/shapes/svg?seed=${user.uid}`}
              alt={user.displayName}
              className="w-8 h-8 rounded-full border border-purple-500/40 object-cover"
            />
          </div>
        )}
      </div>
    </header>
  );
};
