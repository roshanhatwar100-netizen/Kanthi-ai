import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Film, Download, Image as ImageIcon, Upload, Play, Loader2, Check } from 'lucide-react';
import { apiFetch } from '../api';
import { Generation } from '../types';
import { useAuth } from '../context/AuthContext';

type MotionPreset = 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right';

const MOTIONS: { id: MotionPreset; label: string; hint: string }[] = [
  { id: 'zoom-in', label: 'Zoom In', hint: 'Slow push toward the subject' },
  { id: 'zoom-out', label: 'Zoom Out', hint: 'Gentle pull-back reveal' },
  { id: 'pan-left', label: 'Pan Left', hint: 'Smooth glide to the left' },
  { id: 'pan-right', label: 'Pan Right', hint: 'Smooth glide to the right' },
];

interface ImageAnimatorProps {
  notify: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
  onOpenPricing?: () => void;
}

const ANIMATE_COST = 5;

// Charge credits server-side before a client-side render. Returns true if paid.
export async function spendCredits(
  reason: 'animate-video' | 'studio-render',
  units: number,
  notify: ImageAnimatorProps['notify'],
  onOpenPricing?: () => void
): Promise<boolean> {
  try {
    const res = await apiFetch('/api/credits/spend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, units }),
    });
    const data = await res.json();
    if (!res.ok) {
      if (res.status === 402 && onOpenPricing) {
        notify('info', data.error || 'Not enough credits.', 'Insufficient credits');
        onOpenPricing();
      } else {
        notify('error', data.error || 'Payment failed.', 'Could not charge credits');
      }
      return false;
    }
    return true;
  } catch (err: any) {
    notify('error', err.message || 'Payment failed.', 'Could not charge credits');
    return false;
  }
}

// Return a recent client-render charge when the browser-side render fails before
// producing a video. The server only refunds what was actually charged in the last
// 10 minutes, so this is safe to call on genuine failures.
export async function refundCredits(
  reason: 'animate-video' | 'studio-render',
  units: number,
  notify: ImageAnimatorProps['notify']
): Promise<void> {
  try {
    const res = await apiFetch('/api/credits/refund', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, units }),
    });
    const data = await res.json();
    if (res.ok) {
      notify('info', `${data.refunded} credits were returned to your balance.`, 'Render failed — refunded');
    }
  } catch {
    // refund failed silently; the ledger still shows the original charge
  }
}

// Draw one animation frame. t is 0..1 progress through the clip.
function drawFrame(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  t: number,
  motion: MotionPreset,
  W: number,
  H: number
) {
  const base = Math.max(W / img.width, H / img.height);
  const ZOOM_RANGE = 0.28;
  let scale = base;
  let dx = 0;
  let dy = 0;
  if (motion === 'zoom-in') {
    scale = base * (1 + ZOOM_RANGE * t);
  } else if (motion === 'zoom-out') {
    scale = base * (1 + ZOOM_RANGE * (1 - t));
  } else {
    // pans run slightly zoomed-in so edges never show
    scale = base * (1 + ZOOM_RANGE);
    const travel = W * 0.12;
    dx = motion === 'pan-left' ? travel / 2 - travel * t : -travel / 2 + travel * t;
  }
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(img, (W - dw) / 2 + dx, (H - dh) / 2 + dy, dw, dh);
}

export const ImageAnimator: React.FC<ImageAnimatorProps> = ({ notify, onOpenPricing }) => {
  const { refreshCredits } = useAuth();
  const [images, setImages] = useState<Generation[]>([]);
  const [loadingImages, setLoadingImages] = useState(true);
  const [selectedSrc, setSelectedSrc] = useState<string | null>(null);
  const [motion, setMotion] = useState<MotionPreset>('zoom-in');
  const [durationSec, setDurationSec] = useState<5 | 10>(5);
  const [aspect, setAspect] = useState<'16:9' | '9:16'>('16:9');
  const [isRecording, setIsRecording] = useState(false);
  const [recordProgress, setRecordProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const rafRef = useRef<number>(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordStartRef = useRef<number>(0);

  const W = aspect === '16:9' ? 1280 : 720;
  const H = aspect === '16:9' ? 720 : 1280;

  // Load the user's image generations for the picker.
  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch('/api/user/generations');
        const data = await res.json();
        const gens: Generation[] = data.generations || data || [];
        setImages(gens.filter((g) => (g.mediaType || 'image') === 'image' && g.status === 'completed'));
      } catch {
        // picker simply stays empty
      } finally {
        setLoadingImages(false);
      }
    })();
  }, []);

  // Load the selected image element (cross-origin safe: data URLs + same-origin).
  useEffect(() => {
    if (!selectedSrc) {
      imgRef.current = null;
      return;
    }
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
    };
    img.onerror = () => {
      imgRef.current = null;
      notify('error', 'Could not load that image. Try uploading it instead.', 'Image load failed');
    };
    img.src = selectedSrc;
  }, [selectedSrc, notify]);

  // Live preview loop (not recording).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedSrc) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let start = performance.now();
    const loop = (now: number) => {
      const img = imgRef.current;
      if (img && img.complete && img.naturalWidth > 0) {
        const t = ((now - start) / (durationSec * 1000)) % 1;
        drawFrame(ctx, img, t, motion, W, H);
      } else {
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, W, H);
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSrc, motion, durationSec, aspect]);

  const handleUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        notify('error', 'Please choose an image file.', 'Invalid file');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedSrc(reader.result as string);
        setVideoUrl(null);
      };
      reader.readAsDataURL(file);
    },
    [notify]
  );

  const handleCreate = useCallback(async () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) {
      notify('error', 'Pick an image first.', 'No image selected');
      return;
    }
    if (isRecording) return;
    // Charge 5 credits before rendering.
    const paid = await spendCredits('animate-video', 0, notify, onOpenPricing);
    if (!paid) return;
    refreshCredits().catch(() => {});
    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';
    try {
      cancelAnimationFrame(rafRef.current);
      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000 });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        setIsRecording(false);
        setRecordProgress(0);
        notify('success', `Your ${durationSec}s video is ready (${ANIMATE_COST} credits used).`, 'Video created');
      };
      recorderRef.current = recorder;
      recorder.start(250);
      setIsRecording(true);
      recordStartRef.current = performance.now();
      const ctx = canvas.getContext('2d')!;
      const total = durationSec * 1000;
      const step = (now: number) => {
        const elapsed = now - recordStartRef.current;
        const t = Math.min(elapsed / total, 1);
        drawFrame(ctx, img, t, motion, W, H);
        setRecordProgress(t);
        if (t < 1) {
          rafRef.current = requestAnimationFrame(step);
        } else {
          recorder.stop();
        }
      };
      rafRef.current = requestAnimationFrame(step);
    } catch (err: any) {
      setIsRecording(false);
      notify('error', err.message || 'Recording failed in this browser.', 'Could not create video');
      // Credits were already charged — return them since no video was produced.
      refundCredits('animate-video', 0, notify).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording, motion, durationSec, aspect, notify]);

  const pickImageSrc = (g: Generation) => g.mediaUrl || g.imageUrl;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
        <Film className="w-4 h-4 shrink-0" />
        <span>
          Turn any image into a video with cinematic motion — rendered right in your browser.
          Only <strong>{ANIMATE_COST} credits</strong> per video.
        </span>
      </div>

      {/* Step 1: pick image */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <ImageIcon className="w-4 h-4" /> 1. Choose an image
        </h3>
        <div className="flex gap-3 flex-wrap">
          <label className="cursor-pointer flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-white/20 hover:border-white/40 text-sm">
            <Upload className="w-4 h-4" /> Upload
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          </label>
          {loadingImages && <span className="text-sm text-white/50 py-2.5">Loading your images…</span>}
          {!loadingImages && images.length === 0 && (
            <span className="text-sm text-white/50 py-2.5">
              No generated images yet — generate one in Image Studio or upload above.
            </span>
          )}
        </div>
        {images.length > 0 && (
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-3 max-h-44 overflow-y-auto pr-1">
            {images.slice(0, 24).map((g) => {
              const src = pickImageSrc(g);
              const active = selectedSrc === src;
              return (
                <button
                  key={g.generationId}
                  onClick={() => {
                    setSelectedSrc(src);
                    setVideoUrl(null);
                  }}
                  className={`relative rounded-lg overflow-hidden aspect-square border-2 transition ${
                    active ? 'border-emerald-400' : 'border-transparent hover:border-white/30'
                  }`}
                  title={g.prompt}
                >
                  <img src={src} alt={g.prompt} className="w-full h-full object-cover" />
                  {active && (
                    <span className="absolute top-1 right-1 bg-emerald-500 rounded-full p-0.5">
                      <Check className="w-3 h-3 text-white" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Step 2: motion + settings */}
      <div>
        <h3 className="text-sm font-semibold mb-3">2. Pick a motion</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {MOTIONS.map((m) => (
            <button
              key={m.id}
              onClick={() => setMotion(m.id)}
              className={`text-left px-3 py-2.5 rounded-xl border text-sm transition ${
                motion === m.id
                  ? 'border-emerald-400 bg-emerald-500/10'
                  : 'border-white/10 hover:border-white/30'
              }`}
            >
              <div className="font-medium">{m.label}</div>
              <div className="text-xs text-white/50">{m.hint}</div>
            </button>
          ))}
        </div>
        <div className="flex gap-2 mt-3 flex-wrap">
          {([5, 10] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDurationSec(d)}
              className={`px-4 py-2 rounded-xl text-sm border transition ${
                durationSec === d ? 'border-emerald-400 bg-emerald-500/10' : 'border-white/10 hover:border-white/30'
              }`}
            >
              {d}s
            </button>
          ))}
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
        </div>
      </div>

      {/* Step 3: preview + create */}
      <div>
        <h3 className="text-sm font-semibold mb-3">3. Preview & create</h3>
        <div className="rounded-2xl overflow-hidden border border-white/10 bg-black max-w-xl">
          {selectedSrc ? (
            <canvas ref={canvasRef} width={W} height={H} className="w-full block" />
          ) : (
            <div className="aspect-video flex items-center justify-center text-white/40 text-sm">
              Select or upload an image to preview the motion
            </div>
          )}
        </div>
        {isRecording && (
          <div className="mt-3 max-w-xl">
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-emerald-400 transition-none"
                style={{ width: `${Math.round(recordProgress * 100)}%` }}
              />
            </div>
            <p className="text-xs text-white/50 mt-1">Rendering video… {Math.round(recordProgress * 100)}%</p>
          </div>
        )}
        <div className="flex gap-3 mt-4 flex-wrap">
          <button
            onClick={handleCreate}
            disabled={!selectedSrc || isRecording}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm text-black"
          >
            {isRecording ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {isRecording ? 'Rendering…' : `Create ${durationSec}s Video (${ANIMATE_COST} credits)`}
          </button>
          {videoUrl && (
            <a
              href={videoUrl}
              download={`kanthi-animated-${Date.now()}.webm`}
              className="flex items-center gap-2 px-6 py-3 rounded-xl border border-white/20 hover:border-white/40 font-semibold text-sm"
            >
              <Download className="w-4 h-4" /> Download Video
            </a>
          )}
        </div>
        {videoUrl && (
          <video src={videoUrl} controls loop className="mt-4 rounded-2xl max-w-xl w-full border border-white/10" />
        )}
      </div>
    </div>
  );
};
