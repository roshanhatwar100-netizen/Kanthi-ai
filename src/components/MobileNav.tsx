import React from 'react';
import { Wand2, Video, Mic, Compass, FolderKanban, History, User, Layers, Sparkles } from 'lucide-react';
import { TabType } from './Sidebar';

interface MobileNavProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ currentTab, onSelectTab }) => {
  const tabs = [
    { id: 'create' as TabType, label: 'Image', icon: Wand2 },
    { id: 'video' as TabType, label: 'Video', icon: Video, highlight: true },
    { id: 'audio' as TabType, label: 'Audio', icon: Mic },
    { id: 'influencer' as TabType, label: 'AI Star', icon: Sparkles, highlight: true },
    { id: 'dashboard' as TabType, label: 'Hub', icon: Layers },
    { id: 'explore' as TabType, label: 'Explore', icon: Compass },
    { id: 'projects' as TabType, label: 'Projects', icon: FolderKanban },
    { id: 'settings' as TabType, label: 'Profile', icon: User },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0C0E14]/95 backdrop-blur-2xl border-t border-[#1C202C] px-1 pt-1 pb-safe-bottom flex items-center justify-around shadow-2xl">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = currentTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all relative ${
              isActive ? 'text-purple-400 font-bold' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab.highlight ? (
              <div
                className={`w-9 h-9 -mt-3 rounded-full flex items-center justify-center shadow-lg transition-transform ${
                  isActive
                    ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white scale-110 shadow-pink-600/40'
                    : 'bg-[#181C28] text-pink-400 border border-pink-500/30'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
            ) : (
              <Icon className="w-4 h-4 mb-0.5" />
            )}
            <span className="text-[10px] tracking-tight">{tab.label}</span>
            {isActive && !tab.highlight && (
              <span className="w-1 h-1 bg-purple-400 rounded-full mt-0.5" />
            )}
          </button>
        );
      })}
    </div>
  );
};
