import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { Sidebar, TabType } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { MobileNav } from './components/MobileNav';
import { LandingPage } from './components/LandingPage';
import { Dashboard } from './components/Dashboard';
import { ImageGenerator } from './components/ImageGenerator';
import { VideoGenerator } from './components/VideoGenerator';
import { AudioGenerator } from './components/AudioGenerator';
import { InfluencerStudio } from './components/InfluencerStudio';
import { ExploreView } from './components/ExploreView';
import { HistoryView } from './components/HistoryView';
import { ProjectsView } from './components/ProjectsView';
import { FavoritesView } from './components/FavoritesView';
import { SettingsView } from './components/SettingsView';
import { AdminDashboard } from './components/AdminDashboard';
import { PricingModal } from './components/PricingModal';
import { AuthModal } from './components/AuthModal';
import { ToastContainer, ToastMessage } from './components/Toast';

export default function App() {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [isLandingMode, setIsLandingMode] = useState(false);

  // Modals
  const [pricingOpen, setPricingOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  // Preset transfer into ImageGenerator
  const [presetPrompt, setPresetPrompt] = useState<string>('');
  const [presetStyle, setPresetStyle] = useState<string>('');
  const [presetAspectRatio, setPresetAspectRatio] = useState<string>('1:1');

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const notify = (type: 'success' | 'error' | 'info', message: string, title?: string) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newToast: ToastMessage = { id, type, message, title };
    setToasts(prev => [...prev.slice(-4), newToast]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const handleDismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleOpenCreateWithPreset = (preset: { prompt: string; style: string; aspectRatio: string }) => {
    setPresetPrompt(preset.prompt);
    setPresetStyle(preset.style);
    setPresetAspectRatio(preset.aspectRatio);
    setCurrentTab('create');
    setIsLandingMode(false);
  };

  const handleRemixExplorePrompt = (promptText: string) => {
    setPresetPrompt(promptText);
    setCurrentTab('create');
    setIsLandingMode(false);
    notify('info', 'Loaded community prompt into Studio workspace.', 'Remix Ready');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08090C] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-cyan-400 p-[1.5px] animate-pulse">
          <div className="w-full h-full bg-[#08090C] rounded-[14px] flex items-center justify-center font-display font-extrabold text-transparent bg-clip-text bg-gradient-to-tr from-purple-400 to-cyan-300 text-2xl">
            K
          </div>
        </div>
        <div className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
          Initializing KANTHI AI Studio...
        </div>
      </div>
    );
  }

  // If user requests landing page or is guest wanting marketing view
  if (isLandingMode && !user) {
    return (
      <>
        <LandingPage
          onStartCreating={() => {
            setIsLandingMode(false);
            setCurrentTab('create');
          }}
          onExplore={() => {
            setIsLandingMode(false);
            setCurrentTab('explore');
          }}
          onOpenPricing={() => setPricingOpen(true)}
        />
        <PricingModal
          isOpen={pricingOpen}
          onClose={() => setPricingOpen(false)}
          notify={notify}
        />
        <AuthModal
          isOpen={authOpen}
          onClose={() => setAuthOpen(false)}
          notify={notify}
        />
        <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
      </>
    );
  }

  return (
    <div className="flex h-screen bg-[#08090C] text-gray-100 overflow-hidden font-sans">
      {/* Desktop Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={tab => {
          if (tab === 'pricing') {
            setPricingOpen(true);
          } else {
            setCurrentTab(tab);
          }
        }}
        onOpenPricing={() => setPricingOpen(true)}
      />

      {/* Main App Container */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        <Navbar
          currentTab={currentTab}
          onSelectTab={tab => {
            if (tab === 'pricing') {
              setPricingOpen(true);
            } else {
              setCurrentTab(tab);
            }
          }}
          onOpenPricing={() => setPricingOpen(true)}
          onOpenAuth={() => setAuthOpen(true)}
        />

        {/* Scrollable Main Content Canvas */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-8">
          {currentTab === 'dashboard' && (
            <Dashboard
              onSelectTab={setCurrentTab}
              onOpenCreateWithPreset={handleOpenCreateWithPreset}
              onOpenPricing={() => setPricingOpen(true)}
            />
          )}

          {currentTab === 'create' && (
            <ImageGenerator
              initialPrompt={presetPrompt}
              initialStyle={presetStyle}
              initialAspectRatio={presetAspectRatio}
              onOpenPricing={() => setPricingOpen(true)}
              onOpenAuth={() => setAuthOpen(true)}
              notify={notify}
            />
          )}

          {currentTab === 'video' && (
            <VideoGenerator
              initialPrompt={presetPrompt}
              onOpenPricing={() => setPricingOpen(true)}
              onOpenAuth={() => setAuthOpen(true)}
              notify={notify}
            />
          )}

          {currentTab === 'audio' && (
            <AudioGenerator
              onOpenPricing={() => setPricingOpen(true)}
              onOpenAuth={() => setAuthOpen(true)}
              notify={notify}
            />
          )}

          {currentTab === 'influencer' && (
            <InfluencerStudio
              notify={notify}
              onOpenPricing={() => setPricingOpen(true)}
            />
          )}

          {currentTab === 'explore' && (
            <ExploreView
              notify={notify}
              onRemixPrompt={handleRemixExplorePrompt}
            />
          )}

          {currentTab === 'history' && (
            <HistoryView
              notify={notify}
              onSelectPrompt={p => {
                setPresetPrompt(p);
                setCurrentTab('create');
              }}
            />
          )}

          {currentTab === 'projects' && (
            <ProjectsView notify={notify} />
          )}

          {currentTab === 'favorites' && (
            <FavoritesView notify={notify} />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              onOpenPricing={() => setPricingOpen(true)}
              notify={notify}
            />
          )}

          {currentTab === 'admin' && (
            <AdminDashboard notify={notify} />
          )}
        </main>

        {/* Mobile Fixed Bottom Navigation */}
        <MobileNav currentTab={currentTab} onSelectTab={setCurrentTab} />
      </div>

      {/* Pricing Modal */}
      <PricingModal
        isOpen={pricingOpen}
        onClose={() => setPricingOpen(false)}
        notify={notify}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        notify={notify}
      />

      {/* Global Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
}
