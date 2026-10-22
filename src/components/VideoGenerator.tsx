import { apiFetch } from '../api';
import React, { useState, useEffect } from 'react';
import { ImageAnimator } from './ImageAnimator';
import { FacelessStudio } from './FacelessStudio';
import {
  Video,
  Sparkles,
  Zap,
  Play,
  Pause,
  Download,
  Heart,
  Share2,
  RefreshCw,
  FolderPlus,
  Sliders,
  Maximize2,
  Volume2,
  VolumeX,
  Layers,
  Repeat,
  ShieldCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { Generation, Project } from '../types';

export type VideoDuration = '4s' | '6s' | '8s';

interface VideoGeneratorProps {
  initialPrompt?: string;
  onOpenPricing: () => void;
  onOpenAuth: () => void;
  onGenerationCreated?: (gen: Generation) => void;
  notify: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
}

export const VideoGenerator: React.FC<VideoGeneratorProps> = ({
  initialPrompt = '',
  onOpenPricing,
  onOpenAuth,
  onGenerationCreated,
  notify
}) => {
  const { user, refreshCredits, updateLocalCredits } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [prompt, setPrompt] = useState(initialPrompt);
  const [negativePrompt, setNegativePrompt] = useState('');
  const [showNegative, setShowNegative] = useState(false);
  const [selectedModel, setSelectedModel] = useState('veo-3.1-generate-preview');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [duration, setDuration] = useState<VideoDuration>('8s');
  const [motionSpeed, setMotionSpeed] = useState<'smooth' | 'dynamic' | 'cinematic'>('cinematic');
  const [selectedStyle, setSelectedStyle] = useState('Cinematic 4K');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [currentGeneration, setCurrentGeneration] = useState<Generation | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [generationStepText, setGenerationStepText] = useState('');
  const [isFavorited, setIsFavorited] = useState(false);

  // Video playback states
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(true);

  // Mode: 'animate' = free browser-based image animation, 'veo' = server-side AI video (needs billing),
  // 'studio' = free long-form faceless video builder.
  const [mode, setMode] = useState<'animate' | 'veo' | 'studio'>('animate');

  const durationOptions: { id: VideoDuration; label: string; sub: string; cr: number }[] = [
    { id: '4s', label: '4s', sub: 'Quick', cr: 60 },
    { id: '6s', label: '6s', sub: 'Reel', cr: 75 },
    { id: '8s', label: '8s', sub: 'Cinematic', cr: 90 }
  ];

  // Credit cost (Admin has 0 cost exemption!)
  const selectedDurationOpt = durationOptions.find(o => o.id === duration);
  const baseCost = selectedDurationOpt?.cr || 10;
  const currentCost = isAdmin ? 0 : baseCost;

  const stylePresets = [
    'Cinematic 4K',
    'Cyberpunk Neon',
    'Anime & Shinkai',
    'Aerial Drone Shot',
    '3D CGI Animation',
    'Dark Fantasy Drama',
    'Vintage 35mm Film'
  ];

  useEffect(() => {
    if (user) {
      apiFetch('/api/projects', { headers: {} })
        .then(r => r.json())
        .then(d => { if (d.projects) setProjects(d.projects); })
        .catch(() => {});
    }
  }, [user]);

  const handleEnhancePrompt = async () => {
    if (!prompt.trim()) {
      notify('info', 'Enter a video concept to enhance.');
      return;
    }
    setIsEnhancing(true);
    try {
      const res = await apiFetch('/api/enhance-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: `Cinematic video sequence: ${prompt.trim()}` })
      });
      const data = await res.json();
      if (res.ok && data.enhancedPrompt) {
        setPrompt(data.enhancedPrompt);
        notify('success', 'Prompt enhanced with camera motion & atmospheric depth!', 'Video Prompt Polished');
      }
    } catch (e) {
      notify('error', 'Could not enhance prompt');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (!user) { onOpenAuth(); return; }
    if (!prompt.trim()) { notify('info', 'Please describe the scene to animate into video.', 'Prompt Required'); return; }
    if (!isAdmin && user.credits < currentCost) {
      notify('error', `You need ${currentCost} credits for video generation.`, 'Insufficient Credits');
      onOpenPricing();
      return;
    }

    setIsGenerating(true);
    setGenerationStepText('Starting Google Veo 3.1 render...');

    try {
      const res = await apiFetch('/api/generate/video', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          negativePrompt: showNegative ? negativePrompt.trim() : undefined,
          model: selectedModel,
          aspectRatio,
          duration,
          motionSpeed,
          style: selectedStyle,
          projectId: selectedProjectId || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.creditsRestored) refreshCredits();
        throw new Error(data.error || 'Video generation failed to start.');
      }

      setCurrentGeneration(data.generation);
      updateLocalCredits(data.creditsRemaining);
      refreshCredits();

      let generation = data.generation;
      for (let attempt = 0; attempt < 36 && generation.status === 'processing'; attempt++) {
        setGenerationStepText(attempt < 4 ? 'Veo is composing motion and audio...' : `Rendering cinematic frames... (${Math.round((attempt + 1) * 5)}s)`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        const statusRes = await apiFetch(`/api/generate/video/${generation.generationId}`, { headers: {} });
        const statusData = await statusRes.json();
        if (!statusRes.ok) throw new Error(statusData.error || 'Could not check video status.');
        generation = statusData.generation || generation;
        setCurrentGeneration(generation);
        if (statusData.status === 'failed' || generation.status === 'failed') {
          refreshCredits();
          throw new Error(statusData.error || 'Veo video generation failed. Your credits were restored.');
        }
      }

      if (generation.status !== 'completed') throw new Error('Video is taking longer than expected. Please check your History shortly.');
      setCurrentGeneration(generation);
      setIsFavorited(false);
      if (onGenerationCreated) onGenerationCreated(generation);
      try { confetti({ particleCount: 80, spread: 65, origin: { y: 0.6 } }); } catch {}
      notify('success', isAdmin ? 'Video generated! (0 credits deducted - Admin Exemption)' : `Video generated successfully (${data.cost} credits used).`, 'Motion Render Complete');
    } catch (err: any) {
      notify('error', err.message || 'Video generation encountered an error.', 'Video Notice');
    } finally {
      setIsGenerating(false);
      setGenerationStepText('');
    }
  };

  const handleDownload = () => {
    const url = currentGeneration?.mediaUrl || currentGeneration?.imageUrl;
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `kanthi_video_${currentGeneration.generationId}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    notify('success', 'Video download initiated');
  };

  return (
    <div className="p-3 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1C202C] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Video className="w-7 h-7 text-pink-400" />
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
              AI Video Studio
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
              Google Veo 3.1
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Transform text prompts and visual ideas into high-definition cinematic video sequences
          </p>
        </div>

        {/* Cost & Admin Exemption Badge */}
        <div className="flex items-center gap-2">
          {isAdmin ? (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-purple-950/40 border border-purple-500/40 text-purple-200 text-xs font-bold shadow-lg">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span>Admin Unlimited: 0 cr</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#121520] border border-[#23293D] text-xs">
              <span className="text-gray-400">Video Cost:</span>
              <span className="font-bold text-amber-400 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 fill-amber-400" />
                {currentCost} credits
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode('animate')}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold border transition ${
            mode === 'animate'
              ? 'border-emerald-400 bg-emerald-500/10 text-emerald-200'
              : 'border-[#23293D] text-gray-400 hover:border-white/30'
          }`}
        >
          Animate Image <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">5 cr</span>
        </button>
        <button
          onClick={() => setMode('veo')}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold border transition ${
            mode === 'veo'
              ? 'border-pink-400 bg-pink-500/10 text-pink-200'
              : 'border-[#23293D] text-gray-400 hover:border-white/30'
          }`}
        >
          AI Video <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300">Veo</span>
        </button>
        <button
          onClick={() => setMode('studio')}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold border transition ${
            mode === 'studio'
              ? 'border-amber-400 bg-amber-500/10 text-amber-200'
              : 'border-[#23293D] text-gray-400 hover:border-white/30'
          }`}
        >
          Long Video Studio <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">5+ cr</span>
        </button>
      </div>

      {mode === 'animate' ? (
        <ImageAnimator notify={notify} onOpenPricing={onOpenPricing} />
      ) : mode === 'studio' ? (
        <FacelessStudio notify={notify} onOpenPricing={onOpenPricing} />
      ) : (
      <>
      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Video Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Prompt Box */}
          <div className="rounded-3xl p-5 bg-[#10131C] border border-[#1F2536] shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-pink-400" />
                <span>Video Scene Prompt</span>
              </label>

              <button
                onClick={handleEnhancePrompt}
                disabled={isEnhancing || isGenerating}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-pink-600/20 hover:bg-pink-600/40 border border-pink-500/40 text-pink-200 text-xs font-bold transition-all"
              >
                <Sparkles className={`w-3.5 h-3.5 text-cyan-300 ${isEnhancing ? 'animate-spin' : ''}`} />
                <span>{isEnhancing ? 'Enhancing...' : 'Enhance Video Prompt'}</span>
              </button>
            </div>

            <textarea
              rows={4}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Describe motion and camera movement... (e.g. Drone fly-through of neo-Tokyo at sunset, neon signs reflecting on wet asphalt, cinematic camera pan down, 4K 60fps)"
              className="w-full bg-[#0B0D14] text-white text-sm rounded-xl p-3.5 border border-[#1C2234] focus:outline-none focus:border-pink-500 leading-relaxed resize-none"
            />

            {/* Negative Prompt toggle */}
            <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
              <span>{prompt.length} characters</span>
              <button
                onClick={() => setShowNegative(!showNegative)}
                className="text-gray-400 hover:text-pink-300 transition-colors"
              >
                {showNegative ? '− Hide negative prompt' : '+ Add negative prompt'}
              </button>
            </div>

            {showNegative && (
              <input
                type="text"
                value={negativePrompt}
                onChange={e => setNegativePrompt(e.target.value)}
                placeholder="stuttering, blurry, jerky camera, morphing artifacts, distorted anatomy"
                className="w-full bg-[#0B0D14] text-white text-xs rounded-xl p-2.5 border border-[#23293D] focus:outline-none focus:border-rose-500"
              />
            )}
          </div>

          {/* Model & Aspect Ratio Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Model Card */}
            <div className="rounded-2xl p-4 bg-[#10131C] border border-[#1F2536] space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-300 block">
                Video Engine Model
              </label>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setSelectedModel('veo-3.1-generate-preview')}
                  className={`w-full p-2.5 rounded-xl border text-left text-xs transition-all ${
                    selectedModel === 'veo-3.1-generate-preview'
                      ? 'bg-pink-950/40 border-pink-500 text-white shadow-md'
                      : 'bg-[#0B0D14] border-[#1C2234] text-gray-400'
                  }`}
                >
                  <div className="font-bold text-white">Google Veo 3.1</div>
                  <div className="text-[10px] text-gray-400">High-definition continuous diffusion</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedModel('veo-3.1-fast-generate-preview')}
                  className={`w-full p-2.5 rounded-xl border text-left text-xs transition-all ${
                    selectedModel === 'veo-3.1-fast-generate-preview'
                      ? 'bg-pink-950/40 border-pink-500 text-white shadow-md'
                      : 'bg-[#0B0D14] border-[#1C2234] text-gray-400'
                  }`}
                >
                  <div className="font-bold text-white">Veo Fast Motion</div>
                  <div className="text-[10px] text-gray-400">Rapid ideation motion preview</div>
                </button>
              </div>
            </div>

            {/* Aspect Ratio Selector */}
            <div className="rounded-2xl p-4 bg-[#10131C] border border-[#1F2536] space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-300 block">
                Video Aspect Ratio
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['16:9', '9:16'] as const).map(ar => (
                  <button
                    key={ar}
                    type="button"
                    onClick={() => setAspectRatio(ar)}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      aspectRatio === ar
                        ? 'bg-pink-600/20 border-pink-500 text-white'
                        : 'bg-[#0B0D14] border-[#1C2234] text-gray-400'
                    }`}
                  >
                    <div className="text-xs font-bold">{ar}</div>
                    <div className="text-[9px] text-gray-400">
                      {ar === '16:9' ? 'YouTube' : 'Reels'}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Duration & Motion Dynamics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl p-4 bg-[#10131C] border border-[#1F2536] space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-300 block">
                  Veo Duration (4–8 Seconds)
                </label>
                <span className="text-[10px] text-pink-400 font-semibold">
                  Selected: {duration}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto pr-0.5">
                {durationOptions.map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDuration(opt.id)}
                    className={`p-2 rounded-xl border text-center font-bold text-xs transition-all ${
                      duration === opt.id
                        ? 'bg-pink-600/25 border-pink-500 text-white shadow-sm ring-1 ring-pink-500/50'
                        : 'bg-[#0B0D14] border-[#1C2234] text-gray-400 hover:text-white hover:border-[#2C3348]'
                    }`}
                  >
                    <div className="font-extrabold">{opt.label}</div>
                    <div className="text-[9px] text-gray-400 font-normal">{opt.sub}</div>
                    <span className="block text-[8px] text-amber-400 font-semibold mt-0.5">
                      {isAdmin ? '0 cr' : `${opt.cr} cr`}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl p-4 bg-[#10131C] border border-[#1F2536] space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-300 block">
                Motion Camera Speed
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['smooth', 'cinematic', 'dynamic'] as const).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMotionSpeed(m)}
                    className={`py-2 px-1 rounded-xl border text-center text-xs capitalize transition-all ${
                      motionSpeed === m
                        ? 'bg-pink-600/20 border-pink-500 text-white font-bold'
                        : 'bg-[#0B0D14] border-[#1C2234] text-gray-400'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Style Presets */}
          <div className="rounded-2xl p-4 bg-[#10131C] border border-[#1F2536] space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-300 block">
              Cinematic Aesthetics
            </label>
            <div className="flex flex-wrap gap-2">
              {stylePresets.map(st => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setSelectedStyle(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    selectedStyle === st
                      ? 'bg-gradient-to-r from-pink-600 to-purple-600 border-pink-400 text-white shadow-md'
                      : 'bg-[#0B0D14] border-[#1C2234] text-gray-300 hover:border-gray-600'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Project Association */}
          {projects.length > 0 && (
            <div className="rounded-2xl p-4 bg-[#10131C] border border-[#1F2536] flex items-center justify-between">
              <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                <FolderPlus className="w-4 h-4 text-purple-400" />
                <span>Save to Project Folder:</span>
              </span>
              <select
                value={selectedProjectId}
                onChange={e => setSelectedProjectId(e.target.value)}
                className="bg-[#0B0D14] text-white text-xs rounded-xl px-3 py-1.5 border border-[#1C2234]"
              >
                <option value="">Personal</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={handleGenerateVideo}
            disabled={isGenerating}
            className={`w-full py-4 rounded-2xl font-display font-extrabold text-base tracking-wide flex items-center justify-center gap-3 shadow-xl transition-all active:scale-[0.99] ${
              isGenerating
                ? 'bg-pink-900/40 text-pink-200 cursor-wait border border-pink-500/30'
                : 'bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white shadow-pink-600/30'
            }`}
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin text-pink-300" />
                <span>{generationStepText || 'Rendering Video with Veo...'}</span>
              </>
            ) : (
              <>
                <Video className="w-5 h-5" />
                <span>Generate Video ({currentCost} Credits)</span>
              </>
            )}
          </button>
        </div>

        {/* Right: Video Viewport & Player (5 cols) */}
        <div className="lg:col-span-5 space-y-4 sticky top-24">
          <div className="rounded-3xl p-4 bg-[#10131C] border border-[#1F2536] shadow-2xl space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Video Screen Preview
              </span>
              {currentGeneration && (
                <span className="text-[10px] font-mono text-pink-300 bg-pink-500/10 px-2 py-0.5 rounded border border-pink-500/20">
                  {currentGeneration.duration} • {currentGeneration.aspectRatio}
                </span>
              )}
            </div>

            {/* Video Viewport Container */}
            <div
              className={`relative rounded-2xl overflow-hidden bg-black border border-[#181C28] flex items-center justify-center ${
                aspectRatio === '9:16' ? 'aspect-[9/16] max-h-[500px]' : 'aspect-video'
              }`}
            >
              {isGenerating ? (
                <div className="p-8 text-center space-y-3">
                  <div className="w-16 h-16 rounded-full border-2 border-pink-500/30 border-t-pink-400 animate-spin mx-auto" />
                  <div className="text-sm font-bold text-white">Synthesizing Video Frames</div>
                  <div className="text-xs text-gray-400 animate-pulse">{generationStepText}</div>
                </div>
              ) : currentGeneration?.mediaUrl ? (
                <div className="relative w-full h-full group">
                  <video
                    src={currentGeneration.mediaUrl}
                    poster={currentGeneration.imageUrl}
                    autoPlay
                    loop={isLooping}
                    muted={isMuted}
                    playsInline
                    className="w-full h-full object-cover"
                  />

                  {/* Video Controls Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-between">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setIsMuted(!isMuted)}
                        className="p-1.5 rounded-lg bg-black/60 text-white"
                        title={isMuted ? 'Unmute' : 'Mute'}
                      >
                        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => setIsLooping(!isLooping)}
                        className={`p-1.5 rounded-lg ${isLooping ? 'bg-pink-600 text-white' : 'bg-black/60 text-gray-400'}`}
                        title="Loop toggle"
                      >
                        <Repeat className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs text-white font-medium line-clamp-2">
                        {currentGeneration.prompt}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500 space-y-2">
                  <Video className="w-12 h-12 text-gray-700 mx-auto" />
                  <div className="text-sm font-semibold text-gray-400">Video Canvas Ready</div>
                  <p className="text-xs text-gray-600 max-w-xs mx-auto">
                    Configure duration and aspect ratio, then hit Generate Video to render.
                  </p>
                </div>
              )}
            </div>

            {/* Video Action Bar */}
            {currentGeneration && (
              <div className="pt-2 flex items-center justify-between border-t border-white/5">
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold transition-all shadow"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download MP4</span>
                </button>

                <span className="text-[11px] text-gray-400 font-mono">
                  {currentGeneration.resolution || '1080p'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
};
