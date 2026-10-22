import React from 'react';
import {
  Wand2,
  Video,
  Clapperboard,
  Sparkles,
  UserCheck,
  Tv,
  Music,
  ArrowRight,
  Zap,
  TrendingUp,
  FolderKanban,
  History,
  Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { TabType } from './Sidebar';

interface DashboardProps {
  onSelectTab: (tab: TabType) => void;
  onOpenCreateWithPreset: (preset: { prompt: string; style: string; aspectRatio: string }) => void;
  onOpenPricing: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onSelectTab,
  onOpenCreateWithPreset,
  onOpenPricing
}) => {
  const { user } = useAuth();

  const creationCards = [
    {
      title: 'AI Image',
      description: 'Generate hyper-detailed 1K, 2K & 4K visuals with Gemini 3.1 & Imagen 3.',
      icon: Wand2,
      gradient: 'from-purple-600 via-pink-600 to-purple-800',
      tag: 'Ready to Create',
      isReady: true,
      action: () => onSelectTab('create')
    },
    {
      title: 'Character Creator',
      description: 'Design distinctive cinematic personas with consistent turnaround sheets.',
      icon: UserCheck,
      gradient: 'from-pink-600 via-rose-600 to-purple-700',
      tag: 'Specialized Preset',
      isReady: true,
      action: () =>
        onOpenCreateWithPreset({
          prompt: 'Full-body character concept turnaround sheet, distinct cyber-punk protagonist with high collar trench coat, volumetric lighting, 8k character design',
          style: 'Character Concept',
          aspectRatio: '9:16'
        })
    },
    {
      title: 'Anime & Manga',
      description: 'Makoto Shinkai & ufotable inspired aesthetic scenes with vivid sky colors.',
      icon: Tv,
      gradient: 'from-cyan-600 via-blue-600 to-indigo-700',
      tag: 'Specialized Preset',
      isReady: true,
      action: () =>
        onOpenCreateWithPreset({
          prompt: 'Makoto Shinkai aesthetic anime masterwork, celestial stars reflected in calm lake, golden hour sakura petals in wind, 4k digital anime painting',
          style: 'Cinematic Anime',
          aspectRatio: '16:9'
        })
    },
    {
      title: 'AI Video Studio',
      description: 'Text-to-video diffusion generating 1080p clips with Google Veo and smooth camera motion.',
      icon: Video,
      gradient: 'from-pink-600 via-rose-600 to-purple-800',
      tag: 'Ready to Create',
      isReady: true,
      action: () => onSelectTab('video')
    },
    {
      title: 'AI Audio & Music',
      description: 'Generate realistic character voiceovers and ambient background music soundscapes.',
      icon: Music,
      gradient: 'from-cyan-600 via-teal-600 to-blue-800',
      tag: 'Ready to Create',
      isReady: true,
      action: () => onSelectTab('audio')
    },
    {
      title: 'Image → Video',
      description: 'Animate any still portrait or landscape into cinematic continuous camera pans.',
      icon: Clapperboard,
      gradient: 'from-gray-800 to-gray-900',
      tag: 'Coming soon',
      isReady: false
    },
    {
      title: 'AI Editor & Inpainting',
      description: 'Generative fill, canvas expansion, background swap, and precision removal.',
      icon: Sparkles,
      gradient: 'from-gray-800 to-gray-900',
      tag: 'Coming soon',
      isReady: false
    }
  ];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-10">
      {/* Welcome Hero Banner */}
      <div className="relative rounded-3xl p-6 sm:p-10 bg-gradient-to-r from-[#171328] via-[#131624] to-[#0E101A] border border-[#262C3E] shadow-2xl overflow-hidden">
        {/* Ambient Lights */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Welcome back, {user?.displayName?.split(' ')[0] || 'Creator'}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white font-display tracking-tight mb-4">
            Create anything.
          </h1>

          <p className="text-sm sm:text-base text-gray-400 leading-relaxed mb-6 font-light">
            Generate breathtaking images, anime sequences, and concept art powered by Google Gemini
            3.1 Flash Image. Every generation is protected with automatic credit restoration.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onSelectTab('create')}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-purple-700 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-sm shadow-lg shadow-purple-600/30 flex items-center gap-2 transition-all active:scale-95"
            >
              <Wand2 className="w-4 h-4" />
              <span>Open Creation Studio</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>

            <button
              onClick={() => onSelectTab('projects')}
              className="px-5 py-3 rounded-xl bg-[#181D2C] hover:bg-[#22293E] border border-[#282F45] text-gray-200 font-semibold text-sm flex items-center gap-2 transition-colors"
            >
              <FolderKanban className="w-4 h-4 text-purple-400" />
              <span>View Projects</span>
            </button>
          </div>
        </div>
      </div>

      {/* Creative Modules Grid */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-extrabold text-white font-display">Creative Engines</h2>
            <p className="text-xs text-gray-400">Select a tool to start visualizing your story</p>
          </div>
          <span className="text-xs font-semibold text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
            Active Multi-Resolution
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {creationCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div
                key={idx}
                onClick={card.isReady ? card.action : undefined}
                className={`relative rounded-2xl p-5 border transition-all flex flex-col justify-between group ${
                  card.isReady
                    ? 'bg-[#10131C] border-[#1F2435] hover:border-purple-500/50 hover:bg-[#141824] cursor-pointer hover:-translate-y-1 shadow-lg'
                    : 'bg-[#0B0D13]/70 border-[#181B26] opacity-75 cursor-not-allowed'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-md bg-gradient-to-br ${card.gradient}`}
                    >
                      <Icon className="w-5 h-5 text-white" />
                    </div>

                    <span
                      className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full uppercase border ${
                        card.isReady
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                          : 'bg-white/5 text-gray-400 border-white/10 flex items-center gap-1'
                      }`}
                    >
                      {!card.isReady && <Lock className="w-2.5 h-2.5" />}
                      {card.tag}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white mb-1.5 group-hover:text-purple-300 transition-colors">
                    {card.title}
                  </h3>

                  <p className="text-xs text-gray-400 leading-relaxed mb-6 font-light">
                    {card.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs font-semibold">
                  {card.isReady ? (
                    <span className="text-purple-400 group-hover:text-purple-300 flex items-center gap-1">
                      Launch workspace <ArrowRight className="w-3.5 h-3.5 ml-0.5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  ) : (
                    <span className="text-gray-500 font-mono text-[11px]">In development</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Creator Inspiration Prompts */}
      <div className="rounded-2xl p-6 bg-[#0E1119] border border-[#1C2130]">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold text-white">Trending Inspiration Ideas</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            onClick={() =>
              onOpenCreateWithPreset({
                prompt: 'Ethereal celestial samurai standing in glowing lilac wisteria rain, reflection in puddle, octane render 8k cinematic masterpiece',
                style: 'Photorealistic',
                aspectRatio: '16:9'
              })
            }
            className="text-left p-3.5 rounded-xl bg-[#141722] hover:bg-[#1A2030] border border-[#202738] text-xs text-gray-300 hover:text-white transition-all group"
          >
            <div className="text-[10px] text-purple-400 font-bold mb-1 uppercase tracking-wider">Cinematic Masterpiece</div>
            <div className="line-clamp-2">"Ethereal celestial samurai standing in glowing lilac wisteria rain..."</div>
          </button>

          <button
            onClick={() =>
              onOpenCreateWithPreset({
                prompt: 'Cozy magical greenhouse at twilight, glowing fairy lanterns, glass reflection, warm tea cup, studio ghibli anime aesthetic',
                style: 'Anime',
                aspectRatio: '4:3'
              })
            }
            className="text-left p-3.5 rounded-xl bg-[#141722] hover:bg-[#1A2030] border border-[#202738] text-xs text-gray-300 hover:text-white transition-all group"
          >
            <div className="text-[10px] text-cyan-400 font-bold mb-1 uppercase tracking-wider">Cozy Ghibli Anime</div>
            <div className="line-clamp-2">"Cozy magical greenhouse at twilight, glowing fairy lanterns..."</div>
          </button>

          <button
            onClick={() =>
              onOpenCreateWithPreset({
                prompt: 'Hyperrealistic studio portrait of futuristic fashion model with iridescent prism glasses and holographic silk jacket, 85mm lens',
                style: 'Studio Portrait',
                aspectRatio: '9:16'
              })
            }
            className="text-left p-3.5 rounded-xl bg-[#141722] hover:bg-[#1A2030] border border-[#202738] text-xs text-gray-300 hover:text-white transition-all group"
          >
            <div className="text-[10px] text-pink-400 font-bold mb-1 uppercase tracking-wider">Reels / Fashion 9:16</div>
            <div className="line-clamp-2">"Hyperrealistic studio portrait of futuristic fashion model with iridescent prism..."</div>
          </button>
        </div>
      </div>
    </div>
  );
};
