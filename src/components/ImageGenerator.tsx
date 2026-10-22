import { apiFetch } from '../api';
import React, { useState, useEffect } from 'react';
import {
  Wand2,
  Sparkles,
  Zap,
  Download,
  Heart,
  Share2,
  Maximize2,
  RefreshCw,
  FolderPlus,
  AlertCircle,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Sliders,
  Layers,
  Info
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { Generation, Project, ModelConfig } from '../types';

interface ImageGeneratorProps {
  initialPrompt?: string;
  initialStyle?: string;
  initialAspectRatio?: string;
  onOpenPricing: () => void;
  onOpenAuth: () => void;
  onGenerationCreated?: (gen: Generation) => void;
  notify: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
}

export const ImageGenerator: React.FC<ImageGeneratorProps> = ({
  initialPrompt = '',
  initialStyle = '',
  initialAspectRatio = '1:1',
  onOpenPricing,
  onOpenAuth,
  onGenerationCreated,
  notify
}) => {
  const { user, refreshCredits, updateLocalCredits } = useAuth();

  // Generator inputs
  const [prompt, setPrompt] = useState(initialPrompt);
  const [negativePrompt, setNegativePrompt] = useState('');
  const [showNegative, setShowNegative] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-3.1-flash-image-preview');
  const [aspectRatio, setAspectRatio] = useState(initialAspectRatio);
  const [resolution, setResolution] = useState<'1K' | '2K' | '4K'>('1K');
  const [selectedStylePreset, setSelectedStylePreset] = useState(initialStyle);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // States
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [currentGeneration, setCurrentGeneration] = useState<Generation | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [generationStepText, setGenerationStepText] = useState('');
  const [isFavorited, setIsFavorited] = useState(false);
  const [isPublished, setIsPublished] = useState(false);

  // Resolution credit pricing map
  const isAdmin = user?.role === 'admin';
  const costMap: Record<string, number> = {
    '1K': 5,
    '2K': 10,
    '4K': 15,
  };
  const currentCost = isAdmin ? 0 : (costMap[resolution] || 5);

  const stylePresets = [
    { label: 'None', suffix: '' },
    { label: 'Photorealistic', suffix: ', hyperrealistic 8k raw photograph, 85mm lens, natural lighting, highly detailed' },
    { label: 'Cinematic Anime', suffix: ', Makoto Shinkai aesthetic, luminous clouds, celestial colors, 4k digital anime painting' },
    { label: 'Cyberpunk Neon', suffix: ', neo-tokyo cyberpunk, holographic glow, volumetric rain, octane render 8k' },
    { label: 'Dark Fantasy', suffix: ', dark fantasy concept art, atmospheric shadows, golden rim light, epic scale' },
    { label: '3D Render', suffix: ', 3D Pixar character render, smooth textures, subsurface scattering, ambient occlusion' },
    { label: 'Vintage Film', suffix: ', 35mm vintage Kodak Portra film grain, analog warmth, nostalgic cinematic tones' }
  ];

  const aspectRatios = [
    { id: '1:1', label: '1:1', subtitle: 'Square (Post)', w: 'w-8', h: 'h-8' },
    { id: '16:9', label: '16:9', subtitle: 'Landscape (YT)', w: 'w-10', h: 'h-6' },
    { id: '9:16', label: '9:16', subtitle: 'Portrait (Reels)', w: 'w-6', h: 'h-10' },
    { id: '4:3', label: '4:3', subtitle: 'Standard', w: 'w-8', h: 'h-6' },
  ];

  useEffect(() => {
    if (initialPrompt) setPrompt(initialPrompt);
    if (initialAspectRatio) setAspectRatio(initialAspectRatio);
  }, [initialPrompt, initialAspectRatio]);

  // Fetch user projects
  useEffect(() => {
    if (user) {
      apiFetch('/api/projects', {
        headers: {}
      })
        .then(res => res.json())
        .then(data => {
          if (data.projects) setProjects(data.projects);
        })
        .catch(() => {});
    }
  }, [user]);

  // Prompt Enhancer handler
  const handleEnhancePrompt = async () => {
    if (!prompt.trim()) {
      notify('info', 'Please enter a base idea to enhance.', 'Empty Prompt');
      return;
    }
    setIsEnhancing(true);
    try {
      const res = await apiFetch('/api/enhance-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to enhance prompt.');
      }

      setPrompt(data.enhancedPrompt);
      notify('success', 'Gemini enhanced your prompt with cinematic depth!', 'Prompt Elevated');
    } catch (err: any) {
      notify('error', err.message || 'Could not connect to Gemini prompt enhancer.');
    } finally {
      setIsEnhancing(false);
    }
  };

  // Real Image Generation flow
  const handleGenerate = async () => {
    if (!user) {
      onOpenAuth();
      return;
    }

    if (!prompt.trim()) {
      notify('info', 'Please describe the image you want to generate.', 'Prompt Required');
      return;
    }

    if (!isAdmin && user.credits < currentCost) {
      notify(
        'error',
        `You need ${currentCost} credits for ${resolution} generation, but have ${user.credits}. Please refill.`,
        'Insufficient Credits'
      );
      onOpenPricing();
      return;
    }

    setIsGenerating(true);
    setGenerationStepText('Checking content safety & reserving credits...');

    // Apply selected style preset if present
    let finalPrompt = prompt.trim();
    const activePreset = stylePresets.find(p => p.label === selectedStylePreset);
    if (activePreset && activePreset.suffix && !finalPrompt.includes(activePreset.suffix)) {
      finalPrompt += activePreset.suffix;
    }

    try {
      setTimeout(() => {
        setGenerationStepText(`Calling Google Gemini ${selectedModel.includes('3.1') ? '3.1' : 'AI'} engine...`);
      }, 1000);

      setTimeout(() => {
        setGenerationStepText(`Rendering ${resolution} canvas with ${aspectRatio} aspect ratio...`);
      }, 3000);

      const res = await apiFetch('/api/generate/image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: finalPrompt,
          negativePrompt: showNegative ? negativePrompt.trim() : undefined,
          model: selectedModel,
          aspectRatio,
          resolution,
          projectId: selectedProjectId || undefined
        })
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.creditsRestored) {
          refreshCredits();
        }
        throw new Error(data.error || 'Generation failed.');
      }

      // Successful creation
      setCurrentGeneration(data.generation);
      setIsFavorited(false);
      setIsPublished(false);
      updateLocalCredits(data.creditsRemaining);
      refreshCredits();

      if (onGenerationCreated) {
        onGenerationCreated(data.generation);
      }

      // Fire celebratory confetti!
      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 }
        });
      } catch (e) {}

      notify(
        'success',
        `Render completed successfully (${data.cost} credits used).`,
        'Masterpiece Created'
      );
    } catch (err: any) {
      console.error(err);
      notify('error', err.message || 'Generation failed. Reserved credits were restored.', 'Generation Notice');
    } finally {
      setIsGenerating(false);
      setGenerationStepText('');
    }
  };

  // Toggle favorite
  const handleToggleFavorite = async () => {
    if (!currentGeneration || !user) return;
    try {
      const res = await apiFetch('/api/favorites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ generationId: currentGeneration.generationId })
      });
      const data = await res.json();
      setIsFavorited(data.favorited);
      notify('success', data.favorited ? 'Added to favorites' : 'Removed from favorites');
    } catch (e) {
      notify('error', 'Failed to toggle favorite');
    }
  };

  // Toggle publish to community
  const handleTogglePublish = async () => {
    if (!currentGeneration || !user) return;
    try {
      const nextPublic = !isPublished;
      const res = await apiFetch(`/api/explore/${currentGeneration.generationId}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isPublic: nextPublic })
      });
      if (res.ok) {
        setIsPublished(nextPublic);
        notify(
          'success',
          nextPublic ? 'Published to Community Explore feed!' : 'Hidden from public feed.'
        );
      }
    } catch (e) {
      notify('error', 'Failed to update visibility');
    }
  };

  // Download image
  const handleDownload = () => {
    if (!currentGeneration?.imageUrl) return;
    const a = document.createElement('a');
    a.href = currentGeneration.imageUrl;
    a.download = `kanthi_${currentGeneration.generationId}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    notify('success', 'Image download initiated');
  };

  // Copy prompt
  const handleCopyPrompt = () => {
    if (!prompt) return;
    navigator.clipboard.writeText(prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
    notify('info', 'Prompt copied to clipboard');
  };

  return (
    <div className="p-3 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1C202C] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
              AI Image Studio
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              v3.1
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Generate high-resolution creative assets with Google Gemini 3.1 & Imagen 3 models
          </p>
        </div>

        {/* Cost & Balance quick badge */}
        <div className="flex items-center gap-3">
          {isAdmin ? (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-purple-950/40 border border-purple-500/40 text-purple-200 text-xs font-bold shadow-lg">
              <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>Admin Unlimited: 0 cr</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#121520] border border-[#23293D] text-xs">
              <span className="text-gray-400">Resolution Cost:</span>
              <span className="font-bold text-amber-400 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 fill-amber-400" />
                {currentCost} credits
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Creative Controls (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Prompt Input Box */}
          <div className="rounded-2xl p-4 sm:p-5 bg-[#10131C] border border-[#1F2536] shadow-xl focus-within:border-purple-500/60 transition-colors">
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-bold tracking-wider uppercase text-gray-300 flex items-center gap-1.5">
                <Wand2 className="w-3.5 h-3.5 text-purple-400" />
                <span>Creative Prompt</span>
              </label>

              {/* Gemini Prompt Enhancer Button */}
              <button
                onClick={handleEnhancePrompt}
                disabled={isEnhancing || isGenerating}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-purple-600/30 via-pink-600/30 to-purple-600/30 hover:from-purple-600/50 hover:to-pink-600/50 border border-purple-500/40 text-purple-200 text-xs font-bold transition-all disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 text-cyan-300 ${isEnhancing ? 'animate-spin' : ''}`} />
                <span>{isEnhancing ? 'Enhancing with Gemini...' : 'Enhance Prompt'}</span>
              </button>
            </div>

            <textarea
              rows={4}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Describe what you want to create... (e.g. A celestial goddess in holographic gold silk robes amidst aurora borealis, Makoto Shinkai style, 4k cinematic)"
              className="w-full bg-[#0B0D14] text-white text-sm rounded-xl p-3.5 border border-[#1C2234] focus:outline-none focus:border-purple-500 transition-colors placeholder:text-gray-600 resize-none leading-relaxed font-sans"
            />

            <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-[11px] text-gray-500">
              <div className="flex items-center gap-2">
                <span>{prompt.length} characters</span>
                {prompt && (
                  <button
                    onClick={handleCopyPrompt}
                    className="hover:text-gray-300 transition-colors flex items-center gap-1"
                  >
                    {copiedPrompt ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedPrompt ? 'Copied' : 'Copy'}</span>
                  </button>
                )}
              </div>

              {/* Negative prompt toggle */}
              <button
                onClick={() => setShowNegative(!showNegative)}
                className="text-gray-400 hover:text-purple-300 transition-colors flex items-center gap-1"
              >
                <span>Negative prompt</span>
                {showNegative ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            {/* Negative Prompt Input */}
            {showNegative && (
              <div className="mt-3 pt-3 border-t border-white/5 animate-slide-down">
                <label className="text-[11px] font-semibold text-rose-300 mb-1.5 block">
                  Negative Prompt (Elements to avoid):
                </label>
                <input
                  type="text"
                  value={negativePrompt}
                  onChange={e => setNegativePrompt(e.target.value)}
                  placeholder="blurry, distorted anatomy, low quality, artifacts, watermark, extra limbs"
                  className="w-full bg-[#0B0D14] text-white text-xs rounded-lg px-3 py-2 border border-[#23293D] focus:outline-none focus:border-rose-500/50"
                />
              </div>
            )}
          </div>

          {/* Model Selection */}
          <div className="rounded-2xl p-4 sm:p-5 bg-[#10131C] border border-[#1F2536]">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold tracking-wider uppercase text-gray-300">
                AI Generation Model
              </label>
              <span className="text-[10px] text-gray-400">Current Google Gen AI Preview</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedModel('gemini-3.1-flash-image-preview')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  selectedModel === 'gemini-3.1-flash-image-preview'
                    ? 'bg-purple-950/40 border-purple-500 text-white shadow-lg shadow-purple-950/50'
                    : 'bg-[#0B0D14] border-[#1C2234] text-gray-400 hover:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">Gemini 3.1 Flash Image</span>
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-purple-500/30 text-purple-200">
                    Recommended
                  </span>
                </div>
                <div className="text-[11px] text-gray-400">
                  Flagship high-fidelity engine with 1K/2K/4K multi-resolution rendering.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedModel('imagen-3.0-generate-002')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  selectedModel === 'imagen-3.0-generate-002'
                    ? 'bg-purple-950/40 border-purple-500 text-white shadow-lg shadow-purple-950/50'
                    : 'bg-[#0B0D14] border-[#1C2234] text-gray-400 hover:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">Imagen 3.0 Core</span>
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-200">
                    Photoreal
                  </span>
                </div>
                <div className="text-[11px] text-gray-400">
                  Google Imagen 3 engine specializing in physical lighting and realism.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedModel('gemini-3.1-flash-lite-image')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  selectedModel === 'gemini-3.1-flash-lite-image'
                    ? 'bg-purple-950/40 border-purple-500 text-white shadow-lg shadow-purple-950/50'
                    : 'bg-[#0B0D14] border-[#1C2234] text-gray-400 hover:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">Gemini 3.1 Flash-Lite</span>
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-200">
                    Fast
                  </span>
                </div>
                <div className="text-[11px] text-gray-400">
                  Lightweight generator optimized for rapid concept ideation.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedModel('gemini-2.5-flash-image')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  selectedModel === 'gemini-2.5-flash-image'
                    ? 'bg-purple-950/40 border-purple-500 text-white shadow-lg shadow-purple-950/50'
                    : 'bg-[#0B0D14] border-[#1C2234] text-gray-400 hover:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">Gemini 2.5 Flash Image</span>
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-gray-700 text-gray-300">
                    Standard
                  </span>
                </div>
                <div className="text-[11px] text-gray-400">
                  Stable general purpose model for multi-style concept explorations.
                </div>
              </button>
            </div>
          </div>

          {/* Aspect Ratio & Resolution Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Aspect Ratio Selector */}
            <div className="rounded-2xl p-4 bg-[#10131C] border border-[#1F2536]">
              <label className="text-xs font-bold tracking-wider uppercase text-gray-300 block mb-2.5">
                Aspect Ratio
              </label>

              <div className="grid grid-cols-4 gap-2">
                {aspectRatios.map(ar => (
                  <button
                    key={ar.id}
                    type="button"
                    onClick={() => setAspectRatio(ar.id)}
                    className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                      aspectRatio === ar.id
                        ? 'bg-purple-600/20 border-purple-500 text-white'
                        : 'bg-[#0B0D14] border-[#1C2234] text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <div
                      className={`border border-current rounded-sm ${ar.w} ${ar.h} flex items-center justify-center`}
                    />
                    <span className="text-xs font-bold">{ar.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quality & Resolution Selector */}
            <div className="rounded-2xl p-4 bg-[#10131C] border border-[#1F2536]">
              <label className="text-xs font-bold tracking-wider uppercase text-gray-300 block mb-2.5">
                Resolution & Quality
              </label>

              <div className="grid grid-cols-3 gap-2">
                {(['1K', '2K', '4K'] as const).map(res => (
                  <button
                    key={res}
                    type="button"
                    onClick={() => setResolution(res)}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center transition-all ${
                      resolution === res
                        ? 'bg-purple-600/20 border-purple-500 text-white shadow-md'
                        : 'bg-[#0B0D14] border-[#1C2234] text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <span className="text-sm font-extrabold">{res}</span>
                    <span className="text-[10px] text-amber-400 font-semibold">{costMap[res]} cr</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Style Presets Bar */}
          <div className="rounded-2xl p-4 bg-[#10131C] border border-[#1F2536]">
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-bold tracking-wider uppercase text-gray-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span>Creative Style Presets</span>
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              {stylePresets.map(preset => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() =>
                    setSelectedStylePreset(selectedStylePreset === preset.label ? '' : preset.label)
                  }
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    selectedStylePreset === preset.label
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 border-purple-400 text-white shadow-md'
                      : 'bg-[#0B0D14] border-[#1C2234] text-gray-300 hover:border-gray-600'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Project Association Dropdown */}
          {projects.length > 0 && (
            <div className="rounded-2xl p-4 bg-[#10131C] border border-[#1F2536] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-gray-300">Assign to Project:</span>
              </div>
              <select
                value={selectedProjectId}
                onChange={e => setSelectedProjectId(e.target.value)}
                className="bg-[#0B0D14] text-white text-xs rounded-xl px-3 py-1.5 border border-[#1C2234] focus:outline-none focus:border-purple-500"
              >
                <option value="">None (Personal)</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Master Generation Action Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className={`w-full py-4 rounded-2xl font-display font-extrabold text-base tracking-wide flex items-center justify-center gap-3 shadow-xl transition-all active:scale-[0.99] ${
              isGenerating
                ? 'bg-purple-900/40 text-purple-200 cursor-wait border border-purple-500/30'
                : 'bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white shadow-purple-600/30 hover:shadow-purple-500/50'
            }`}
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin text-cyan-300" />
                <span>{generationStepText || 'Generating Masterpiece...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Generate Image ({currentCost} Credits)</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: Output Showcase & Canvas (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-4 sticky top-24">
          <div className="rounded-3xl p-4 bg-[#10131C] border border-[#1F2536] shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Studio Viewport
              </span>
              {currentGeneration && (
                <span className="text-[10px] font-mono text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                  {currentGeneration.resolution} • {currentGeneration.aspectRatio}
                </span>
              )}
            </div>

            {/* Canvas Display Area */}
            <div
              className={`relative rounded-2xl overflow-hidden bg-[#07080D] border border-[#181C28] flex items-center justify-center ${
                aspectRatio === '16:9'
                  ? 'aspect-video'
                  : aspectRatio === '9:16'
                  ? 'aspect-[9/16] max-h-[550px]'
                  : aspectRatio === '4:3'
                  ? 'aspect-[4/3]'
                  : 'aspect-square'
              }`}
            >
              {isGenerating ? (
                /* Ambient Generating State */
                <div className="p-8 text-center space-y-4">
                  <div className="relative w-16 h-16 mx-auto">
                    <div className="absolute inset-0 rounded-full border-2 border-purple-500/30 border-t-purple-400 animate-spin" />
                    <div className="w-full h-full rounded-full flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-cyan-300 animate-pulse" />
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white mb-1">
                      Generating with Gemini AI
                    </div>
                    <div className="text-xs text-gray-400 max-w-xs mx-auto animate-pulse">
                      {generationStepText || 'Synthesizing prompt tokens and volumetric light...'}
                    </div>
                  </div>
                </div>
              ) : currentGeneration ? (
                /* Active Result Image */
                <div className="relative w-full h-full group">
                  <img
                    src={currentGeneration.imageUrl}
                    alt={currentGeneration.prompt}
                    className="w-full h-full object-cover"
                  />

                  {/* Hover Overlay Controls */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setLightboxOpen(true)}
                        className="p-2 rounded-xl bg-black/60 hover:bg-black/90 text-white backdrop-blur-md transition-colors"
                        title="Expand view"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs text-gray-200 line-clamp-2 drop-shadow">
                        {currentGeneration.prompt}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* Empty Ready State */
                <div className="p-8 text-center text-gray-500 space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-[#121622] flex items-center justify-center mx-auto text-gray-600 border border-[#1E2435]">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-300">Canvas Ready</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Enter a prompt and hit Generate to visualize your scene.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Bar for Generated Image */}
            {currentGeneration && (
              <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1A1F2E] hover:bg-[#252C42] text-white text-xs font-semibold transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>

                  <button
                    onClick={handleToggleFavorite}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
                      isFavorited
                        ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                        : 'bg-[#1A1F2E] border-transparent text-gray-300 hover:text-white'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${isFavorited ? 'fill-rose-400' : ''}`} />
                    <span>{isFavorited ? 'Saved' : 'Favorite'}</span>
                  </button>

                  <button
                    onClick={handleTogglePublish}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
                      isPublished
                        ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                        : 'bg-[#1A1F2E] border-transparent text-gray-300 hover:text-white'
                    }`}
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>{isPublished ? 'Published' : 'Publish'}</span>
                  </button>
                </div>

                <button
                  onClick={() => setLightboxOpen(true)}
                  className="text-xs text-purple-400 hover:text-purple-300 font-semibold"
                >
                  Full Details
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox Zoom Modal */}
      {lightboxOpen && currentGeneration && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <div
            className="max-w-4xl max-h-[90vh] bg-[#0E1119] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
              <img
                src={currentGeneration.imageUrl}
                alt={currentGeneration.prompt}
                className="max-h-[70vh] w-auto object-contain"
              />
            </div>

            <div className="p-5 border-t border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-purple-400">
                  {currentGeneration.model} • {currentGeneration.resolution} • {currentGeneration.aspectRatio}
                </span>
                <button
                  onClick={handleDownload}
                  className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download High-Res</span>
                </button>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed font-sans">{currentGeneration.prompt}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
