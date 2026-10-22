import { apiFetch } from '../api';
import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Filter,
  Download,
  Heart,
  Trash2,
  Maximize2,
  Calendar,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Generation } from '../types';

interface HistoryViewProps {
  notify: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
  onSelectPrompt?: (prompt: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ notify, onSelectPrompt }) => {
  const { user } = useAuth();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>('all');
  const [selectedGeneration, setSelectedGeneration] = useState<Generation | null>(null);

  const fetchGenerations = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await apiFetch('/api/user/generations', {
        headers: {}
      });
      const data = await res.json();
      if (data.generations) {
        setGenerations(data.generations);
      }
    } catch (err) {
      notify('error', 'Failed to load generation history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGenerations();
  }, [user]);

  const handleDelete = async (generationId: string) => {
    if (!user) return;
    if (!confirm('Are you sure you want to delete this generation?')) return;
    try {
      const res = await apiFetch(`/api/generations/${generationId}`, {
        method: 'DELETE',
        headers: {}
      });
      if (res.ok) {
        setGenerations(prev => prev.filter(g => g.generationId !== generationId));
        if (selectedGeneration?.generationId === generationId) {
          setSelectedGeneration(null);
        }
        notify('success', 'Generation removed from history');
      }
    } catch (e) {
      notify('error', 'Failed to delete generation');
    }
  };

  const handleToggleFavorite = async (generationId: string) => {
    if (!user) return;
    try {
      const res = await apiFetch('/api/favorites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ generationId })
      });
      const data = await res.json();
      notify('success', data.favorited ? 'Saved to Favorites' : 'Removed from Favorites');
    } catch (e) {
      notify('error', 'Failed to update favorite');
    }
  };

  const filtered = generations.filter(g => {
    const matchesSearch =
      g.prompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.model.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesModel = selectedModel === 'all' || g.model.includes(selectedModel);
    return matchesSearch && matchesModel;
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1C202C] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-6 h-6 text-purple-400" />
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
              Generation History
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Review and download all your past created visuals ({generations.length} total)
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search prompts..."
              className="pl-9 pr-4 py-2 bg-[#10131C] text-xs text-white rounded-xl border border-[#1F2536] focus:outline-none focus:border-purple-500 w-48 sm:w-60"
            />
          </div>

          <select
            value={selectedModel}
            onChange={e => setSelectedModel(e.target.value)}
            className="px-3 py-2 bg-[#10131C] text-xs text-gray-300 rounded-xl border border-[#1F2536] focus:outline-none focus:border-purple-500"
          >
            <option value="all">All Models</option>
            <option value="gemini-3.1">Gemini 3.1</option>
            <option value="imagen">Imagen 3</option>
            <option value="gemini-2.5">Gemini 2.5</option>
          </select>
        </div>
      </div>

      {/* Grid or Empty State */}
      {loading ? (
        <div className="py-20 text-center text-gray-400 space-y-3">
          <Sparkles className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
          <div className="text-sm">Loading your creative catalog...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center rounded-2xl bg-[#0D0F16] border border-[#181C26] p-8 space-y-3">
          <History className="w-10 h-10 text-gray-600 mx-auto" />
          <div className="text-base font-semibold text-gray-300">No generations found</div>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            {searchTerm
              ? 'No matching creations found for your search query.'
              : 'Start in the Create Studio to generate your first visual masterpiece!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(gen => (
            <div
              key={gen.generationId}
              className="group relative rounded-2xl overflow-hidden bg-[#10131C] border border-[#1F2536] hover:border-purple-500/50 transition-all hover:shadow-xl flex flex-col justify-between"
            >
              <div
                className="relative aspect-square overflow-hidden cursor-pointer bg-black"
                onClick={() => setSelectedGeneration(gen)}
              >
                <img
                  src={gen.imageUrl}
                  alt={gen.prompt}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      handleToggleFavorite(gen.generationId);
                    }}
                    className="p-1.5 rounded-lg bg-black/60 hover:bg-black/90 text-white backdrop-blur"
                  >
                    <Heart className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      handleDelete(gen.generationId);
                    }}
                    className="p-1.5 rounded-lg bg-black/60 hover:bg-rose-600 text-white backdrop-blur"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur px-2 py-0.5 rounded text-[10px] font-mono text-purple-300">
                  {gen.resolution} • {gen.aspectRatio}
                </div>
              </div>

              <div className="p-3 text-left space-y-2">
                <p className="text-xs text-gray-300 line-clamp-2 leading-relaxed font-sans">
                  {gen.prompt}
                </p>
                <div className="flex items-center justify-between text-[10px] text-gray-500 pt-1 border-t border-white/5">
                  <span>{new Date(gen.createdAt).toLocaleDateString()}</span>
                  <span className="text-purple-400 font-medium">{gen.creditsUsed} cr</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Lightbox Modal */}
      {selectedGeneration && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setSelectedGeneration(null)}
        >
          <div
            className="max-w-3xl w-full bg-[#10131C] border border-[#23293D] rounded-3xl overflow-hidden shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="max-h-[60vh] bg-black flex items-center justify-center overflow-hidden">
              <img
                src={selectedGeneration.imageUrl}
                alt={selectedGeneration.prompt}
                className="max-h-[60vh] w-auto object-contain"
              />
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-purple-400">
                  {selectedGeneration.model} • {selectedGeneration.resolution} • {selectedGeneration.aspectRatio}
                </span>

                <div className="flex items-center gap-2">
                  <a
                    href={selectedGeneration.imageUrl}
                    download={`kanthi_${selectedGeneration.generationId}.jpg`}
                    className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </a>
                  <button
                    onClick={() => handleDelete(selectedGeneration.generationId)}
                    className="p-2 rounded-xl bg-rose-500/20 text-rose-300 hover:bg-rose-500/30"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <div className="text-[11px] uppercase font-bold text-gray-400 mb-1">Prompt:</div>
                <p className="text-xs text-gray-200 leading-relaxed bg-[#0B0D14] p-3 rounded-xl border border-white/5">
                  {selectedGeneration.prompt}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
