import { apiFetch } from '../api';
import React, { useState, useEffect } from 'react';
import {
  Compass,
  Heart,
  Flag,
  Copy,
  Check,
  Sparkles,
  Download,
  Share2,
  Wand2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Generation } from '../types';

interface ExploreViewProps {
  notify: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
  onRemixPrompt?: (prompt: string, style?: string) => void;
}

export const ExploreView: React.FC<ExploreViewProps> = ({ notify, onRemixPrompt }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportModalItem, setReportModalItem] = useState<Generation | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchExploreItems = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/explore');
      const data = await res.json();
      if (data.items) {
        setItems(data.items);
      }
    } catch (e) {
      notify('error', 'Failed to load community feed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExploreItems();
  }, []);

  const handleLike = async (generationId: string) => {
    if (!user) {
      notify('info', 'Please sign in to like community creations.');
      return;
    }
    try {
      const res = await apiFetch(`/api/explore/${generationId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      const data = await res.json();
      setItems(prev =>
        prev.map(item =>
          item.generationId === generationId
            ? {
                ...item,
                likes: data.likes,
                likedBy: data.isLiked
                  ? [...(item.likedBy || []), user.uid]
                  : (item.likedBy || []).filter(u => u !== user.uid)
              }
            : item
        )
      );
    } catch (e) {
      notify('error', 'Could not record like');
    }
  };

  const handleCopyPrompt = (gen: Generation) => {
    navigator.clipboard.writeText(gen.prompt);
    setCopiedId(gen.generationId);
    setTimeout(() => setCopiedId(null), 2000);
    notify('success', 'Prompt copied to clipboard!');
  };

  const handleSendReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportModalItem || !user || !reportReason.trim()) return;

    try {
      const res = await apiFetch('/api/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          generationId: reportModalItem.generationId,
          reason: reportReason.trim()
        })
      });
      if (res.ok) {
        notify('success', 'Report submitted. Our moderators will review this visual.');
        setReportModalItem(null);
        setReportReason('');
      }
    } catch (e) {
      notify('error', 'Failed to submit report');
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Feed Header */}
      <div className="border-b border-[#1C202C] pb-5">
        <div className="flex items-center gap-2">
          <Compass className="w-6 h-6 text-cyan-400" />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
            Community Explore
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-gray-400 mt-1">
          Discover, like, and remix studio prompts published by creators worldwide
        </p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-gray-400 space-y-3">
          <Sparkles className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
          <div className="text-sm">Curating explore feed...</div>
        </div>
      ) : items.length === 0 ? (
        <div className="py-20 text-center rounded-2xl bg-[#0D0F16] border border-[#181C26] p-8 space-y-3">
          <Compass className="w-10 h-10 text-gray-600 mx-auto" />
          <div className="text-base font-semibold text-gray-300">No Public Artwork Published Yet</div>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Be the first! Click "Publish" on any of your creations in the Create Studio to display it here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(item => {
            const isLiked = user && item.likedBy?.includes(user.uid);
            return (
              <div
                key={item.generationId}
                className="group rounded-3xl overflow-hidden bg-[#10131C] border border-[#1F2536] hover:border-purple-500/50 transition-all flex flex-col justify-between shadow-xl"
              >
                {/* Artwork Viewport */}
                <div className="relative aspect-[4/3] bg-black overflow-hidden">
                  <img
                    src={item.imageUrl}
                    alt={item.prompt}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />

                  {/* Top badges */}
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/70 backdrop-blur text-purple-300 border border-white/10">
                      {item.resolution}
                    </span>
                  </div>

                  <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setReportModalItem(item)}
                      className="p-1.5 rounded-xl bg-black/60 hover:bg-rose-600 text-white backdrop-blur transition-colors"
                      title="Report Content"
                    >
                      <Flag className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Metadata & Actions */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                      <span className="font-semibold text-purple-300">
                        {item.authorName || 'Creator'}
                      </span>
                      <span className="text-[11px] text-gray-500">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="text-xs text-gray-200 line-clamp-3 leading-relaxed font-sans bg-[#0B0D14] p-2.5 rounded-xl border border-white/5">
                      "{item.prompt}"
                    </p>
                  </div>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleLike(item.generationId)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors ${
                          isLiked
                            ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                            : 'bg-[#151926] border-[#222738] text-gray-400 hover:text-white'
                        }`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-rose-400 text-rose-400' : ''}`} />
                        <span>{item.likes || 0}</span>
                      </button>

                      <button
                        onClick={() => handleCopyPrompt(item)}
                        className="p-2 rounded-xl bg-[#151926] hover:bg-[#1C2234] border border-[#222738] text-gray-300 transition-colors"
                        title="Copy prompt"
                      >
                        {copiedId === item.generationId ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {onRemixPrompt && (
                      <button
                        onClick={() => onRemixPrompt(item.prompt)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-200 text-xs font-semibold transition-colors"
                      >
                        <Wand2 className="w-3 h-3" />
                        <span>Remix</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Report Content Modal */}
      {reportModalItem && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setReportModalItem(null)}
        >
          <div
            className="max-w-md w-full bg-[#10131C] border border-[#262C3E] rounded-3xl p-6 shadow-2xl space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Flag className="w-4 h-4 text-rose-400" />
                <span>Report Artwork</span>
              </h3>
              <button onClick={() => setReportModalItem(null)} className="text-gray-400 hover:text-white">
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-400">
              Please specify the reason this artwork or prompt violates safety or copyright policies:
            </p>

            <form onSubmit={handleSendReport} className="space-y-4">
              <textarea
                required
                rows={3}
                value={reportReason}
                onChange={e => setReportReason(e.target.value)}
                placeholder="Describe reason (e.g., copyright violation, explicit imagery, hate speech)..."
                className="w-full bg-[#0B0D14] text-white text-xs rounded-xl p-3 border border-[#1F2536] focus:outline-none focus:border-rose-500 resize-none"
              />

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReportModalItem(null)}
                  className="px-4 py-2 text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all"
                >
                  Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
