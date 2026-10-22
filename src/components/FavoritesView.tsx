import { apiFetch } from '../api';
import React, { useState, useEffect } from 'react';
import { Heart, Download, Trash2, Sparkles, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Generation } from '../types';

interface FavoritesViewProps {
  notify: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
  onOpenCreateWithPrompt?: (prompt: string) => void;
}

export const FavoritesView: React.FC<FavoritesViewProps> = ({ notify, onOpenCreateWithPrompt }) => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await apiFetch('/api/favorites', {
        headers: {}
      });
      const data = await res.json();
      if (data.favorites) {
        setFavorites(data.favorites);
      }
    } catch (e) {
      notify('error', 'Failed to load favorites');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, [user]);

  const handleRemoveFavorite = async (generationId: string) => {
    if (!user) return;
    try {
      const res = await apiFetch('/api/favorites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ generationId })
      });
      if (res.ok) {
        setFavorites(prev => prev.filter(f => f.generationId !== generationId));
        notify('success', 'Removed from favorites');
      }
    } catch (e) {
      notify('error', 'Failed to remove favorite');
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="border-b border-[#1C202C] pb-5">
        <div className="flex items-center gap-2">
          <Heart className="w-6 h-6 text-rose-400 fill-rose-400" />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
            Favorited Artworks
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-gray-400 mt-1">
          Your curated private showcase of favorite generations ({favorites.length} saved)
        </p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-gray-400 space-y-3">
          <Sparkles className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
          <div className="text-sm">Loading favorites...</div>
        </div>
      ) : favorites.length === 0 ? (
        <div className="py-20 text-center rounded-2xl bg-[#0D0F16] border border-[#181C26] p-8 space-y-3">
          <Heart className="w-10 h-10 text-gray-600 mx-auto" />
          <div className="text-base font-semibold text-gray-300">No Favorites Saved Yet</div>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Click the heart icon on any generated artwork to store it in your personal collection.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {favorites.map(gen => (
            <div
              key={gen.generationId}
              className="group rounded-2xl overflow-hidden bg-[#10131C] border border-[#1F2536] hover:border-purple-500/50 transition-all flex flex-col justify-between"
            >
              <div className="relative aspect-square overflow-hidden bg-black">
                <img src={gen.imageUrl} alt={gen.prompt} className="w-full h-full object-cover" />
                <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleRemoveFavorite(gen.generationId)}
                    className="p-1.5 rounded-lg bg-black/60 hover:bg-rose-600 text-white backdrop-blur"
                    title="Remove favorite"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="p-3 text-left space-y-2">
                <p className="text-xs text-gray-300 line-clamp-2 leading-relaxed">{gen.prompt}</p>
                <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px] text-gray-500">
                  <span className="font-mono text-purple-400">{gen.resolution}</span>
                  <a
                    href={gen.imageUrl}
                    download={`kanthi_${gen.generationId}.jpg`}
                    className="hover:text-white flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" /> Download
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
