import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Clapperboard, Plus, Trash2, ArrowUp, ArrowDown, Image as ImageIcon,
  Upload, Play, Download, Loader2, Type
} from 'lucide-react';
import { apiFetch } from '../api';
import { Generation } from '../types';
import { useAuth } from '../context/AuthContext';
import { spendCredits, refundCredits } from './ImageAnimator';

// 5 credits per 30 seconds of rendered video (minimum 5).
export function studioCost(totalSec: number): number {
  return Math.max(5, Math.ceil(totalSec / 30) * 5);
}

interface Scene {
  id: string;
  imageSrc: string | null;
  caption: string;
  durationSec: number;
  motion: 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right';
}

interface FacelessStudioProps {
  notify: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
  onOpenPricing?: () => void;
}

const MOTIONS = ['zoom-in', 'zoom-out', 'pan-left', 'pan-right'] as const;
const DURATIONS = [5, 10, 15, 30, 60];

let sceneSeq = 0;
const newScene = (): Scene => ({
  id: `scene_${Date.now()}_${sceneSeq++}`,
  imageSrc: null,
  caption: '',
  durationSec: 10,
  motion: MOTIONS[Math.floor(Math.random() * MOTIONS.length)],
});

function drawSceneFrame(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  t: number,
  motion: Scene['motion'],
  W: number,
  H: number,
  caption: string
) {
  const base = Math.max(W / img.width, H / img.height);
  const ZR = 0.28;
  let scale = base, dx = 0;
  if (motion === 'zoom-in') scale = base * (1 + ZR * t);
  else if (motion === 'zoom-out') scale = base * (1 + ZR * (1 - t));
  else {
    scale = base * (1 + ZR);
    const travel = W * 0.12;
    dx = motion === 'pan-left' ? travel / 2 - travel * t : -travel / 2 + travel * t;
  }
  const dw = img.width * scale, dh = img.height * scale;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(img, (W - dw) / 2 + dx, (H - dh) / 2, dw, dh);

  // Subtitle bar
  if (caption.trim()) {
    const pad = 28;
    ctx.font = `600 ${Math.round(H * 0.042)}px system-ui, sans-serif`;
    const maxW = W - pad * 2;
    const words = caption.trim().split(/\s+/);
    const lines: string[] = [];
    let line = '';
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > maxW && line) {
        lines.push(line);
        line = w;
      } else line = test;
    }
    if (line) lines.push(line);
    const lineH = H * 0.058;
    const boxH = lines.length * lineH + 32;
    const boxY = H - boxH - 36;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    const boxW = Math.min(maxW + 48, W - 48);
    const boxX = (W - boxW) / 2;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 14);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    lines.forEach((l, i) => ctx.fillText(l, W / 2, boxY + 16 + i * lineH));
  }
}

function formatClock(totalSec: number) {
  const m = Math.floor(totalSec / 60);
  const s = Math.round(totalSec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const FacelessStudio: React.FC<FacelessStudioProps> = ({ notify, onOpenPricing }) => {
  const { user, refreshCredits } = useAuth();
  const [scenes, setScenes] = useState<Scene[]>([newScene(), newScene()]);
  const [library, setLibrary] = useState<Generation[]>([]);
  const [aspect, setAspect] = useState<'16:9' | '9:16'>('16:9');
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [pickerFor, setPickerFor] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const imgCache = useRef<Map<string, HTMLImageElement>>(new Map());

  const W = aspect === '16:9' ? 1280 : 720;
  const H = aspect === '16:9' ? 720 : 1280;

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch('/api/user/generations');
        const data = await res.json();
        const gens: Generation[] = data.generations || data || [];
        setLibrary(gens.filter((g) => (g.mediaType || 'image') === 'image' && g.status === 'completed'));
      } catch { /* picker stays empty */ }
    })();
  }, []);

  const loadImage = useCallback((src: string): Promise<HTMLImageElement> => {
    const cached = imgCache.current.get(src);
    if (cached) return Promise.resolve(cached);
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        imgCache.current.set(src, img);
        resolve(img);
      };
      img.onerror = reject;
      img.src = src;
    });
  }, []);

  const updateScene = (id: string, patch: Partial<Scene>) =>
    setScenes((ss) => ss.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const moveScene = (id: string, dir: -1 | 1) =>
    setScenes((ss) => {
      const i = ss.findIndex((s) => s.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= ss.length) return ss;
      const next = [...ss];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const handleUpload = (sceneId: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateScene(sceneId, { imageSrc: reader.result as string });
      setPickerFor(null);
    };
    reader.readAsDataURL(file);
  };

  const totalSec = scenes.reduce((a, s) => a + s.durationSec, 0);

  const handleRender = useCallback(async () => {
    const ready = scenes.filter((s) => s.imageSrc);
    if (ready.length === 0) {
      notify('error', 'Add an image to at least one scene.', 'Nothing to render');
      return;
    }
    if (isRendering) return;
    // Charge credits before rendering (5 per 30s, min 5).
    const totalForCost = ready.reduce((a, s) => a + s.durationSec, 0);
    const paid = await spendCredits('studio-render', totalForCost, notify, onOpenPricing);
    if (!paid) return;
    refreshCredits().catch(() => {});
    const canvas = canvasRef.current;
    if (!canvas) {
      refundCredits('studio-render', totalForCost, notify).catch(() => {});
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      refundCredits('studio-render', totalForCost, notify).catch(() => {});
      return;
    }

    try {
      // Preload all images
      const loaded = new Map<string, HTMLImageElement>();
      for (const s of ready) {
        try {
          loaded.set(s.id, await loadImage(s.imageSrc!));
        } catch {
          notify('error', `Could not load an image in scene — skipping it.`, 'Image load failed');
        }
      }
      const renderScenes = ready.filter((s) => loaded.has(s.id));
      if (renderScenes.length === 0) {
        // All images failed to load after credits were charged — return them.
        refundCredits('studio-render', totalForCost, notify).catch(() => {});
        return;
      }
      const total = renderScenes.reduce((a, s) => a + s.durationSec, 0);

      cancelAnimationFrame(rafRef.current);
      const stream = canvas.captureStream(30);
      const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
      const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000 });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      const done = new Promise<void>((resolve) => { recorder.onstop = () => resolve(); });
      recorder.start(250);
      setIsRendering(true);
      setRenderProgress(0);

      const t0 = performance.now();
      const totalMs = total * 1000;
      // Build scene time boundaries
      let acc = 0;
      const bounds = renderScenes.map((s) => {
        const start = acc;
        acc += s.durationSec * 1000;
        return { scene: s, start, end: acc };
      });

      await new Promise<void>((resolve) => {
        const step = (now: number) => {
          const elapsed = now - t0;
          const clamped = Math.min(elapsed, totalMs);
          const b = bounds.find((x) => clamped < x.end) || bounds[bounds.length - 1];
          const img = loaded.get(b.scene.id)!;
          const t = Math.min(Math.max((clamped - b.start) / (b.end - b.start), 0), 1);
          drawSceneFrame(ctx, img, t, b.scene.motion, W, H, b.scene.caption);
          setRenderProgress(clamped / totalMs);
          if (elapsed < totalMs) {
            rafRef.current = requestAnimationFrame(step);
          } else resolve();
        };
        rafRef.current = requestAnimationFrame(step);
      });

      recorder.stop();
      await done;
      const blob = new Blob(chunks, { type: 'video/webm' });
      setVideoUrl(URL.createObjectURL(blob));
      setIsRendering(false);
      setRenderProgress(0);
      notify('success', `Your ${formatClock(total)} video is ready (${studioCost(total)} credits used).`, 'Video rendered');
    } catch (err: any) {
      setIsRendering(false);
      notify('error', err.message || 'Rendering failed in this browser.', 'Could not render');
      // Credits were already charged — return them since no video was produced.
      refundCredits('studio-render', totalForCost, notify).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenes, isRendering, aspect, notify, loadImage]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
        <Clapperboard className="w-4 h-4 shrink-0" />
        <span>
          <strong>Faceless Video Studio.</strong> Stack scenes with images, captions and motion,
          then render one long video (5 min, 45 min, 2 hr — any length) right in your browser.
          Only <strong>5 credits per 30 seconds</strong>.
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-white/60">Aspect:</span>
        {(['16:9', '9:16'] as const).map((a) => (
          <button
            key={a}
            onClick={() => setAspect(a)}
            className={`px-4 py-2 rounded-xl text-sm border transition ${
              aspect === a ? 'border-emerald-400 bg-emerald-500/10' : 'border-white/10 hover:border-white/30'
            }`}
          >
            {a}
          </button>
        ))}
        <span className="text-sm text-white/60 ml-2">
          Total: <strong className="text-white">{formatClock(totalSec)}</strong> · {scenes.length} scenes
        </span>
        <button
          onClick={() => setScenes((ss) => [...ss, newScene()])}
          className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-xl border border-white/20 hover:border-white/40 text-sm"
        >
          <Plus className="w-4 h-4" /> Add scene
        </button>
      </div>

      <div className="space-y-3">
        {scenes.map((s, i) => (
          <div key={s.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold px-2 py-1 rounded-lg bg-white/10">Scene {i + 1}</span>
              <span className="text-xs text-white/40">{s.durationSec}s</span>
              <div className="ml-auto flex gap-1">
                <button onClick={() => moveScene(s.id, -1)} className="p-1.5 rounded-lg hover:bg-white/10" title="Move up">
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => moveScene(s.id, 1)} className="p-1.5 rounded-lg hover:bg-white/10" title="Move down">
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setScenes((ss) => (ss.length > 1 ? ss.filter((x) => x.id !== s.id) : ss))}
                  className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-300"
                  title="Delete scene"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="flex gap-3 flex-wrap items-start">
              <button
                onClick={() => setPickerFor(pickerFor === s.id ? null : s.id)}
                className="w-28 h-20 rounded-xl overflow-hidden border-2 border-dashed border-white/20 hover:border-white/40 flex items-center justify-center bg-black/30 shrink-0"
              >
                {s.imageSrc ? (
                  <img src={s.imageSrc} alt="" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-white/30" />
                )}
              </button>
              <div className="flex-1 min-w-[220px] space-y-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Type className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                      value={s.caption}
                      onChange={(e) => updateScene(s.id, { caption: e.target.value })}
                      placeholder="Caption / subtitle for this scene…"
                      className="w-full bg-black/30 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm placeholder:text-white/30 focus:border-emerald-400/60 outline-none"
                    />
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <select
                    value={s.motion}
                    onChange={(e) => updateScene(s.id, { motion: e.target.value as Scene['motion'] })}
                    className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm"
                  >
                    {MOTIONS.map((m) => (
                      <option key={m} value={m}>{m.replace('-', ' ')}</option>
                    ))}
                  </select>
                  <select
                    value={s.durationSec}
                    onChange={(e) => updateScene(s.id, { durationSec: Number(e.target.value) })}
                    className="bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm"
                  >
                    {DURATIONS.map((d) => (
                      <option key={d} value={d}>{d}s</option>
                    ))}
                  </select>
                  <label className="cursor-pointer flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 hover:border-white/30 text-sm">
                    <Upload className="w-3.5 h-3.5" /> Upload
                    <input type="file" accept="image/*" className="hidden" onChange={handleUpload(s.id)} />
                  </label>
                </div>
              </div>
            </div>
            {pickerFor === s.id && (
              <div className="mt-3">
                {library.length === 0 ? (
                  <p className="text-xs text-white/40">No generated images yet — generate some in Image Studio first, or upload above.</p>
                ) : (
                  <div className="grid grid-cols-5 sm:grid-cols-8 gap-2 max-h-36 overflow-y-auto pr-1">
                    {library.slice(0, 32).map((g) => {
                      const src = g.mediaUrl || g.imageUrl;
                      return (
                        <button
                          key={g.generationId}
                          onClick={() => { updateScene(s.id, { imageSrc: src }); setPickerFor(null); }}
                          className="rounded-lg overflow-hidden aspect-square border border-transparent hover:border-emerald-400"
                          title={g.prompt}
                        >
                          <img src={src} alt={g.prompt} className="w-full h-full object-cover" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div>
        <canvas ref={canvasRef} width={W} height={H} className="hidden" />
        {isRendering && (
          <div className="mb-3">
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-emerald-400" style={{ width: `${Math.round(renderProgress * 100)}%` }} />
            </div>
            <p className="text-xs text-white/50 mt-1">Rendering… {Math.round(renderProgress * 100)}%</p>
          </div>
        )}
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={handleRender}
            disabled={isRendering}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 font-semibold text-sm text-black"
          >
            {isRendering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {isRendering ? 'Rendering…' : `Render ${formatClock(totalSec)} Video (${studioCost(totalSec)} credits)`}
          </button>
          {videoUrl && (
            <a
              href={videoUrl}
              download={`kanthi-studio-${Date.now()}.webm`}
              className="flex items-center gap-2 px-6 py-3 rounded-xl border border-white/20 hover:border-white/40 font-semibold text-sm"
            >
              <Download className="w-4 h-4" /> Download Video
            </a>
          )}
        </div>
        {videoUrl && (
          <video src={videoUrl} controls className="mt-4 rounded-2xl max-w-xl w-full border border-white/10" />
        )}
        {user?.role !== 'admin' && (
          <p className="text-xs text-white/40 mt-3">Rendered locally in your browser.</p>
        )}
      </div>
    </div>
  );
};
