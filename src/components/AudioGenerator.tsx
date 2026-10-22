import { apiFetch } from '../api';
import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Music,
  Play,
  Pause,
  Download,
  Sparkles,
  Zap,
  Volume2,
  VolumeX,
  Repeat,
  RefreshCw,
  FolderPlus,
  Radio,
  Sliders,
  ShieldCheck,
  Disc
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { Generation, Project } from '../types';

interface AudioGeneratorProps {
  onOpenPricing: () => void;
  onOpenAuth: () => void;
  onGenerationCreated?: (gen: Generation) => void;
  notify: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
}

export const AudioGenerator: React.FC<AudioGeneratorProps> = ({
  onOpenPricing,
  onOpenAuth,
  onGenerationCreated,
  notify
}) => {
  const { user, refreshCredits, updateLocalCredits } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [mode, setMode] = useState<'speech' | 'music'>('speech');
  const [prompt, setPrompt] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('studio_female');
  const [selectedGenre, setSelectedGenre] = useState('cinematic');
  const [selectedProjectId, setSelectedProjectId] = useState('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [currentGeneration, setCurrentGeneration] = useState<Generation | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);

  // Audio Playback
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentCost = isAdmin ? 0 : 8;

  const voices = [
    { id: 'studio_female', name: 'Studio Female', desc: 'Warm, articulate & inspiring narrator' },
    { id: 'studio_male', name: 'Studio Male', desc: 'Deep, resonant cinematic voice' },
    { id: 'anime', name: 'Anime Protagonist', desc: 'Energetic, emotive anime persona' },
    { id: 'cyberpunk', name: 'Cyberpunk Voice AI', desc: 'Futuristic synthetic android tone' },
    { id: 'trailer', name: 'Epic Movie Trailer', desc: 'Low-frequency blockbuster narrator' }
  ];

  const genres = [
    { id: 'cinematic', name: 'Cinematic Orchestral', desc: 'Sweeping strings and dramatic percussion' },
    { id: 'synthwave', name: 'Cyberpunk Synthwave', desc: 'Analog 80s arpeggios and neon basslines' },
    { id: 'lofi', name: 'Lo-Fi Chill Beats', desc: 'Relaxing Rhodes chords and tape warmth' },
    { id: 'ambient', name: 'Ethereal Meditation', desc: 'Calming drones, singing bowls, and space reverb' },
    { id: 'orchestral', name: 'Fantasy Adventure', desc: 'Majestic horns, woodwinds and epic quest theme' }
  ];

  useEffect(() => {
    if (user) {
      apiFetch('/api/projects', { headers: {} })
        .then(r => r.json())
        .then(d => { if (d.projects) setProjects(d.projects); })
        .catch(() => {});
    }
  }, [user]);

  const handleGenerateAudio = async () => {
    if (!user) {
      onOpenAuth();
      return;
    }

    if (!prompt.trim()) {
      notify('info', mode === 'speech' ? 'Please enter speech text to speak.' : 'Describe the soundtrack style.', 'Prompt Required');
      return;
    }

    if (!isAdmin && user.credits < currentCost) {
      notify('error', `You need ${currentCost} credits for audio generation.`, 'Insufficient Credits');
      onOpenPricing();
      return;
    }

    setIsGenerating(true);

    try {
      const res = await apiFetch('/api/generate/audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          type: mode,
          voice: selectedVoice,
          genre: selectedGenre,
          projectId: selectedProjectId || undefined
        })
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.creditsRestored) refreshCredits();
        throw new Error(data.error || 'Audio generation failed.');
      }

      setCurrentGeneration(data.generation);
      updateLocalCredits(data.creditsRemaining);
      refreshCredits();

      if (onGenerationCreated) onGenerationCreated(data.generation);

      try {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      } catch (e) {}

      notify(
        'success',
        isAdmin ? 'Audio synthesized! (0 credits - Admin Exemption)' : `Audio generated (${data.cost} credits used).`,
        'Audio Track Rendered'
      );
    } catch (err: any) {
      notify('error', err.message || 'Audio generation error.', 'Audio Notice');
    } finally {
      setIsGenerating(false);
    }
  };

  const togglePlayAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleDownload = () => {
    const url = currentGeneration?.mediaUrl;
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `kanthi_${mode}_${Date.now()}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    notify('success', 'Audio file downloaded');
  };

  return (
    <div className="p-3 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1C202C] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Mic className="w-7 h-7 text-cyan-400" />
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
              AI Audio & Music Studio
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              Gemini TTS & Neural Audio
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Generate high-fidelity voiceovers, character dialogues, and ambient soundtracks
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin ? (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-purple-950/40 border border-purple-500/40 text-purple-200 text-xs font-bold">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span>Admin Unlimited: 0 cr</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#121520] border border-[#23293D] text-xs">
              <span className="text-gray-400">Audio Cost:</span>
              <span className="font-bold text-amber-400 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 fill-amber-400" />
                {currentCost} credits
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex items-center gap-3 border-b border-[#1C202C] pb-4">
        <button
          onClick={() => setMode('speech')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            mode === 'speech'
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/20'
              : 'bg-[#10131C] text-gray-400 hover:text-white border border-[#1F2536]'
          }`}
        >
          <Mic className="w-4 h-4" />
          <span>Text-to-Speech & Voiceover</span>
        </button>

        <button
          onClick={() => setMode('music')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            mode === 'music'
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-600/20'
              : 'bg-[#10131C] text-gray-400 hover:text-white border border-[#1F2536]'
          }`}
        >
          <Music className="w-4 h-4" />
          <span>Soundtracks & Ambient Music</span>
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Controls Column (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Prompt Area */}
          <div className="rounded-3xl p-5 bg-[#10131C] border border-[#1F2536] shadow-xl space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
              {mode === 'speech' ? <Mic className="w-3.5 h-3.5 text-cyan-400" /> : <Music className="w-3.5 h-3.5 text-purple-400" />}
              <span>{mode === 'speech' ? 'Script or Dialogue to Speak' : 'Music Theme & Mood Description'}</span>
            </label>

            <textarea
              rows={4}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder={
                mode === 'speech'
                  ? 'Enter what the voice actor should say... (e.g. Welcome to KANTHI AI, where every spark of thought transforms into visual wonder.)'
                  : 'Describe music instruments and mood... (e.g. Futuristic synthwave driving through neon highways with deep bass pulses and 80s drums)'
              }
              className="w-full bg-[#0B0D14] text-white text-sm rounded-xl p-3.5 border border-[#1C2234] focus:outline-none focus:border-cyan-500 leading-relaxed resize-none"
            />
          </div>

          {/* Persona / Genre Selection */}
          {mode === 'speech' ? (
            <div className="rounded-2xl p-4 bg-[#10131C] border border-[#1F2536] space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-300 block">
                Voice Actor Persona
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {voices.map(v => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedVoice(v.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedVoice === v.id
                        ? 'bg-cyan-950/40 border-cyan-500 text-white shadow-md'
                        : 'bg-[#0B0D14] border-[#1C2234] text-gray-400'
                    }`}
                  >
                    <div className="font-bold text-xs text-white">{v.name}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{v.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl p-4 bg-[#10131C] border border-[#1F2536] space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-300 block">
                Music Genre & Instrumentation
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {genres.map(g => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setSelectedGenre(g.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedGenre === g.id
                        ? 'bg-purple-950/40 border-purple-500 text-white shadow-md'
                        : 'bg-[#0B0D14] border-[#1C2234] text-gray-400'
                    }`}
                  >
                    <div className="font-bold text-xs text-white">{g.name}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{g.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Project Association */}
          {projects.length > 0 && (
            <div className="rounded-2xl p-4 bg-[#10131C] border border-[#1F2536] flex items-center justify-between">
              <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                <FolderPlus className="w-4 h-4 text-purple-400" />
                <span>Save to Project:</span>
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
            onClick={handleGenerateAudio}
            disabled={isGenerating}
            className={`w-full py-4 rounded-2xl font-display font-extrabold text-base tracking-wide flex items-center justify-center gap-3 shadow-xl transition-all active:scale-[0.99] ${
              isGenerating
                ? 'bg-cyan-900/40 text-cyan-200 cursor-wait border border-cyan-500/30'
                : 'bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white shadow-cyan-600/30'
            }`}
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin text-cyan-300" />
                <span>Rendering Audio Track...</span>
              </>
            ) : (
              <>
                <Disc className="w-5 h-5" />
                <span>Generate Audio ({currentCost} Credits)</span>
              </>
            )}
          </button>
        </div>

        {/* Right: Audio Waveform & Player View (5 cols) */}
        <div className="lg:col-span-5 space-y-4 sticky top-24">
          <div className="rounded-3xl p-6 bg-[#10131C] border border-[#1F2536] shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-cyan-400" />
                <span>Audio Visualizer</span>
              </span>
              {currentGeneration && (
                <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                  {currentGeneration.duration} • HD Audio
                </span>
              )}
            </div>

            {/* Waveform Visualization Box */}
            <div className="p-6 rounded-2xl bg-[#090B10] border border-[#191D2A] flex flex-col items-center justify-center min-h-[180px] relative overflow-hidden">
              {/* Animated Bars */}
              <div className="flex items-end gap-1.5 h-20 w-full justify-center px-4">
                {[...Array(24)].map((_, i) => {
                  const barHeight = isPlaying
                    ? Math.max(12, Math.sin((i + Date.now() / 200) * 0.8) * 45 + 40)
                    : isGenerating
                    ? Math.max(15, Math.sin(i * 0.5) * 35 + 30)
                    : 15;
                  return (
                    <div
                      key={i}
                      style={{ height: `${barHeight}px` }}
                      className={`w-1.5 rounded-full transition-all duration-150 ${
                        isPlaying
                          ? 'bg-gradient-to-t from-cyan-500 to-purple-400 shadow-sm shadow-cyan-500/40'
                          : 'bg-gray-800'
                      }`}
                    />
                  );
                })}
              </div>

              {currentGeneration && (
                <div className="mt-4 text-center">
                  <div className="text-xs font-semibold text-white truncate max-w-xs mx-auto">
                    "{currentGeneration.prompt}"
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">
                    Mode: {currentGeneration.audioVoice || 'Stereo Audio'}
                  </div>
                </div>
              )}

              {/* Hidden audio element */}
              {currentGeneration?.mediaUrl && (
                <audio
                  ref={audioRef}
                  src={currentGeneration.mediaUrl}
                  onEnded={() => setIsPlaying(false)}
                  onTimeUpdate={() => {
                    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
                  }}
                  onLoadedMetadata={() => {
                    if (audioRef.current) setDuration(audioRef.current.duration);
                  }}
                />
              )}
            </div>

            {/* Player Controls Bar */}
            {currentGeneration?.mediaUrl && (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={togglePlayAudio}
                    className="w-12 h-12 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-cyan-500/20 hover:scale-105 active:scale-95 transition-transform"
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1A1F2E] hover:bg-[#252C42] text-white text-xs font-bold transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download WAV</span>
                  </button>

                  <span className="text-[11px] text-cyan-400 font-mono">
                    High-Fidelity Audio
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
