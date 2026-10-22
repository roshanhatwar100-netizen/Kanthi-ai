import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { SERVER_CONFIG } from './config.js';
import { requireAuth, getAuthenticatedUserId, requireAdmin } from './auth.js';
import { db } from './db.js';
import { enhancePromptWithGemini, generateImageWithGemini } from './gemini.js';
import { checkContentSafety } from './moderation.js';
import { validateRealEmail } from './emailValidation.js';
import { startVideoGeneration, getVideoOperation, extractVideoUri, downloadVideo, persistVideoToStorage, streamStoredVideo, deleteStoredVideo } from './video.js';
import { generateAudioWithGemini } from './audio.js';
import {
  createRazorpayOrder,
  getRazorpayOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
  isRazorpayConfigured
} from './razorpay.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';
// Vercel serverless: the Express app is imported by api/index.ts — never start a listener there.
const isVercel = process.env.VERCEL === '1';
const rootDir = path.resolve(__dirname, '..');

// Exported for the Vercel serverless wrapper (api/index.ts) which forwards
// requests to this app without starting its own listener.
export const app = express();

// Enable CORS and high-limit JSON parser for images
app.use(cors());
app.use(express.json({ limit: '50mb', verify: (req, _res, buf) => { (req as any).rawBody = buf.toString('utf8'); } }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Middleware to extract user UID from headers or body
const getUserId = (req: express.Request): string => {
  return getAuthenticatedUserId(req) || 'guest';
};

// --- PUBLIC & SYSTEM APIS ---

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    platform: 'KANTHI AI',
    timestamp: new Date().toISOString(),
    geminiConfigured: SERVER_CONFIG.hasGeminiKey,
    razorpayConfigured: isRazorpayConfigured(),
  });
});

app.get('/api/config', (req, res) => {
  // Vercel (and Cloudflare) attach the visitor's country as a request header.
  const country =
    (req.headers['x-vercel-ip-country'] as string) ||
    (req.headers['cf-ipcountry'] as string) ||
    null;
  res.json({
    appName: 'KANTHI AI',
    tagline: 'Turn imagination into creation.',
    hasGeminiKey: SERVER_CONFIG.hasGeminiKey,
    hasRazorpayConfigured: isRazorpayConfigured(),
    razorpayKeyId: isRazorpayConfigured() ? SERVER_CONFIG.razorpayKeyId : null,
    creditCosts: SERVER_CONFIG.creditCosts,
    plans: SERVER_CONFIG.plans,
    creditPacks: SERVER_CONFIG.creditPacks,
    supportedModels: SERVER_CONFIG.supportedModels,
    country,
    isIndia: country === null ? true : country === 'IN',
  });
});

app.get('/api/models', (req, res) => {
  res.json({ models: SERVER_CONFIG.supportedModels });
});

// Razorpay webhook for async reconciliation
app.post('/api/payments/webhook', (req, res) => {
  const signature = req.headers['x-razorpay-signature'] as string;
  if (!signature) {
    return res.status(400).json({ error: 'Missing x-razorpay-signature header' });
  }

  const rawBody = (req as any).rawBody as string | undefined;
  if (!rawBody) return res.status(400).json({ error: 'Missing raw webhook body.' });
  const isValid = verifyWebhookSignature(rawBody, signature);
  if (!isValid) {
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  // Handle events like payment.captured, order.paid
  const event = req.body.event;
  console.log(`Razorpay webhook event received: ${event}`);
  res.json({ status: 'ok' });
});



// All routes below this point require a verified Firebase ID token.
app.use('/api', requireAuth);

// --- USER SYNC & PROFILE ---

app.post('/api/user/sync', async (req, res) => {
  try {
    const authUser = (req as any).auth;
    const uid = String(authUser?.uid || '');
    const email = String(authUser?.email || '');
    const { displayName, photoURL } = req.body || {};
    if (!uid || !email) {
      return res.status(400).json({ error: 'Authenticated Firebase account is missing uid/email.' });
    }

    const emailValidation = validateRealEmail(email);
    if (!emailValidation.isValid) {
      return res.status(400).json({ error: emailValidation.error });
    }

    let user = await db.getOrCreateUser(uid, email, displayName, photoURL);
    const isAdminAccount = SERVER_CONFIG.adminUids.includes(uid) || SERVER_CONFIG.adminEmails.includes(email.toLowerCase());
    if (isAdminAccount) {
      // Admins get zero-credit unlimited generation — the 50 free credits are for regular users only.
      // Enforced on every sync so the balance can never drift back.
      if (user.role !== 'admin' || user.plan !== 'pro' || user.credits !== 0) {
        user = await db.updateUser(uid, { role: 'admin', plan: 'pro', credits: 0 });
      }
    }
    res.json({ user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/user/credits', async (req, res) => {
  try {
    const uid = getUserId(req);
    if (uid === 'guest') {
      return res.status(401).json({ error: 'Please sign in to view credits.' });
    }
    const user = await db.getUser(uid);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    const transactions = await db.getCreditTransactions(uid);
    res.json({
      credits: user.credits,
      plan: user.plan,
      role: user.role,
      transactions: transactions.slice(0, 20)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Spend credits for client-side features (free animator, studio renders).
// Amount is validated server-side against an allowlist of reasons.
app.post('/api/credits/spend', async (req, res) => {
  try {
    const uid = getUserId(req);
    if (uid === 'guest') {
      return res.status(401).json({ error: 'Please sign in.' });
    }
    const { reason, units } = req.body || {};
    // Server-side price list — the client can only pick a reason, never a price.
    const PRICES: Record<string, (units: number) => number> = {
      'animate-video': () => 5,
      'studio-render': (u) => Math.max(5, Math.ceil((Number(u) || 0) / 30) * 5),
    };
    const priced = PRICES[reason];
    if (!priced) {
      return res.status(400).json({ error: 'Unknown purchase reason.' });
    }
    const cost = priced(Number(units) || 0);
    if (!Number.isFinite(cost) || cost <= 0 || cost > 5000) {
      return res.status(400).json({ error: 'Invalid amount.' });
    }
    let reservation;
    try {
      reservation = await db.reserveCredits(uid, cost, `Client render: ${reason}`);
    } catch (err: any) {
      return res.status(500).json({ error: `Could not process payment: ${err.message}` });
    }
    if (!reservation.success) {
      return res.status(402).json({
        error: `Insufficient credits. This requires ${cost} credits, but you have ${reservation.balanceBefore}.`,
        requiredCredits: cost,
        currentBalance: reservation.balanceBefore
      });
    }
    return res.json({ success: true, cost, creditsRemaining: reservation.balanceAfter });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Refund a client-render spend when the browser-side render fails before producing a video.
// Abuse-resistant: only refunds the net un-refunded spend on the same reason from the last
// 10 minutes, so a client can never mint free credits. Clients call this only when their
// local render throws (MediaRecorder / captureStream unsupported or failing mid-render).
app.post('/api/credits/refund', async (req, res) => {
  try {
    const uid = getUserId(req);
    if (uid === 'guest') {
      return res.status(401).json({ error: 'Please sign in.' });
    }
    const { reason, units } = req.body || {};
    // Same server-side price list as /api/credits/spend — the client never sets a price.
    const PRICES: Record<string, (units: number) => number> = {
      'animate-video': () => 5,
      'studio-render': (u) => Math.max(5, Math.ceil((Number(u) || 0) / 30) * 5),
    };
    const priced = PRICES[reason];
    if (!priced) {
      return res.status(400).json({ error: 'Unknown refund reason.' });
    }
    const cost = priced(Number(units) || 0);
    if (!Number.isFinite(cost) || cost <= 0 || cost > 5000) {
      return res.status(400).json({ error: 'Invalid amount.' });
    }
    const txs = await db.getCreditTransactions(uid); // newest first
    const cutoff = Date.now() - 10 * 60 * 1000;
    let netSpent = 0;
    for (const t of txs) {
      const ts = new Date(t.createdAt || 0).getTime();
      if (!Number.isFinite(ts) || ts < cutoff) break;
      if (t.reason === `Client render: ${reason}`) {
        if (t.type === 'generation') netSpent += -t.amount; // spend amounts are negative
        else if (t.type === 'refund') netSpent -= t.amount; // refund amounts are positive
      }
    }
    if (netSpent < cost) {
      return res.status(400).json({ error: 'No matching recent charge to refund.' });
    }
    const balanceAfter = await db.restoreCredits(uid, cost, `Refund: client render failed (${reason})`);
    return res.json({ success: true, refunded: cost, credits: balanceAfter });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/user/generations', async (req, res) => {
  try {
    const uid = getUserId(req);
    if (uid === 'guest') {
      return res.status(401).json({ error: 'Please sign in.' });
    }
    const gens = await db.getUserGenerations(uid);
    res.json({ generations: gens });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- PROMPT ENHANCER ---

app.post('/api/enhance-prompt', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({ error: 'Prompt cannot be empty.' });
    }

    if (!SERVER_CONFIG.hasGeminiKey) {
      return res.status(503).json({
        error: 'Gemini API is not configured on the server. Please set GEMINI_API_KEY in the environment.'
      });
    }

    const enhanced = await enhancePromptWithGemini(prompt.trim());
    res.json(enhanced);
  } catch (err: any) {
    console.error('Prompt enhance error:', err);
    res.status(500).json({ error: err.message || 'Prompt enhancement failed.' });
  }
});

// --- IMAGE GENERATION (ATOMIC CREDIT ACCOUNTING & REFUNDS) ---

app.post('/api/generate/image', async (req, res) => {
  const uid = getUserId(req);
  if (uid === 'guest') {
    return res.status(401).json({ error: 'Please sign in to generate images.' });
  }

  const {
    prompt,
    negativePrompt,
    model = 'gemini-3.1-flash-image-preview',
    aspectRatio = '1:1',
    resolution = '1K',
    projectId
  } = req.body;

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return res.status(400).json({ error: 'Please enter a generation prompt.' });
  }

  // 1. Content Safety & Moderation check
  const safety = checkContentSafety(prompt, negativePrompt);
  if (safety.status === 'blocked') {
    return res.status(400).json({
      error: `Generation blocked: ${safety.reason}`,
      moderation: safety
    });
  }

  // 2. Calculate credit cost server-side (Admin Exemption: 0 cost)
  // 3. Atomically reserve credits
  let user: Awaited<ReturnType<typeof db.getUser>>;
  let cost: number;
  let reservation: Awaited<ReturnType<typeof db.reserveCredits>>;
  try {
    user = await db.getUser(uid);
    const isAdmin = user?.role === 'admin';
    cost = isAdmin ? 0 : (SERVER_CONFIG.creditCosts[resolution] || SERVER_CONFIG.creditCosts['1K'] || 5);
    reservation = await db.reserveCredits(
      uid,
      cost,
      `Generation: ${resolution} ${aspectRatio} (${model.slice(0, 15)})`
    );
  } catch (err: any) {
    return res.status(500).json({ error: `Could not start generation: ${err.message || 'service unavailable'}` });
  }

  if (!reservation.success) {
    return res.status(402).json({
      error: `Insufficient credits. This generation requires ${cost} credits, but you have ${reservation.balanceBefore}.`,
      requiredCredits: cost,
      currentBalance: reservation.balanceBefore
    });
  }

  const generationId = `gen_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  try {
    // 4. Verify API Key
    if (!SERVER_CONFIG.hasGeminiKey) {
      // Refund reserved credits immediately
      await db.restoreCredits(uid, cost, 'Refund: Gemini API key not configured', generationId);
      return res.status(503).json({
        error: 'Gemini API key is not configured on the server. Your credits were restored.',
        creditsRestored: cost
      });
    }

    // 5. Call Gemini
    const result = await generateImageWithGemini({
      prompt: prompt.trim(),
      negativePrompt: negativePrompt?.trim(),
      model,
      aspectRatio,
      resolution
    });

    // 6. Record completed generation
    const genDoc = {
      generationId,
      uid,
      prompt: prompt.trim(),
      negativePrompt: negativePrompt?.trim(),
      model: result.modelUsed || model,
      aspectRatio,
      resolution,
      imageUrl: result.imageUrl,
      mediaType: 'image' as const,
      mediaUrl: result.imageUrl,
      creditsUsed: cost,
      status: 'completed' as const,
      createdAt: new Date().toISOString(),
      isPublic: false,
      likes: 0,
      likedBy: [],
      authorName: user?.displayName || 'Creator',
      projectId: projectId || undefined
    };

    await db.saveGeneration(genDoc);

    const updatedUser = await db.getUser(uid);

    return res.json({
      success: true,
      generation: genDoc,
      creditsRemaining: updatedUser?.credits ?? 0,
      cost
    });
  } catch (err: any) {
    console.error('Image generation error:', err);
    // 7. Guaranteed credit restoration on failure
    const newBalance = await db.restoreCredits(
      uid,
      cost,
      `Refund: Generation failed (${err.message?.slice(0, 40) || 'unknown error'})`,
      generationId
    );

    return res.status(500).json({
      error: `Generation failed: ${err.message || 'Service temporarily unavailable'}. Your ${cost} credits were restored.`,
      creditsRestored: cost,
      currentBalance: newBalance
    });
  }
});

// --- VIDEO GENERATION (TEXT TO VIDEO) ---
// Veo is a long-running operation. We start it here and let the client poll
// /api/generate/video/:id so Vercel never has to hold a request open for the
// entire render.

app.post('/api/generate/video', async (req, res) => {
  const uid = getUserId(req);
  if (uid === 'guest') return res.status(401).json({ error: 'Please sign in to generate videos.' });

  const {
    prompt,
    negativePrompt,
    model = 'veo-3.1-generate-preview',
    aspectRatio = '16:9',
    duration = '8s',
    motionSpeed = 'cinematic',
    style,
    projectId
  } = req.body;

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'Please enter a video prompt.' });
  }
  const safety = checkContentSafety(prompt, negativePrompt);
  if (safety.status === 'blocked') return res.status(400).json({ error: `Generation blocked: ${safety.reason}`, moderation: safety });

  const durationCostMap: Record<string, number> = { '4s': 60, '6s': 75, '8s': 90 };
  if (!durationCostMap[duration]) return res.status(400).json({ error: 'Veo 3.1 supports 4s, 6s, or 8s generations.' });
  if (aspectRatio !== '16:9' && aspectRatio !== '9:16') return res.status(400).json({ error: 'Veo 3.1 supports 16:9 and 9:16 video.' });

  let user: Awaited<ReturnType<typeof db.getUser>>;
  let cost: number;
  let reservation: Awaited<ReturnType<typeof db.reserveCredits>>;
  try {
    user = await db.getUser(uid);
    const isAdmin = user?.role === 'admin';
    cost = isAdmin ? 0 : durationCostMap[duration];
    reservation = await db.reserveCredits(uid, cost, `Video Generation: ${duration} ${aspectRatio} (${model.slice(0, 15)})`);
  } catch (err: any) {
    return res.status(500).json({ error: `Could not start generation: ${err.message || 'service unavailable'}` });
  }
  if (!reservation.success) return res.status(402).json({
    error: `Insufficient credits. Video generation requires ${cost} credits, but you have ${reservation.balanceBefore}.`,
    requiredCredits: cost, currentBalance: reservation.balanceBefore
  });

  const generationId = `vid_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  try {
    const operation = await startVideoGeneration({
      prompt: prompt.trim(), negativePrompt: negativePrompt?.trim(), model,
      aspectRatio, duration, motionSpeed, style
    });

    const genDoc = {
      generationId, uid, prompt: prompt.trim(), negativePrompt: negativePrompt?.trim(),
      model: operation.modelUsed, aspectRatio, resolution: 'Veo 3.1',
      imageUrl: '', mediaType: 'video' as const, mediaUrl: undefined,
      duration, creditsUsed: cost, status: 'processing' as const,
      createdAt: new Date().toISOString(), isPublic: false, likes: 0, likedBy: [],
      authorName: user?.displayName || 'Creator', projectId: projectId || undefined,
      providerOperationName: operation.operationName
    };
    await db.saveGeneration(genDoc);
    const updatedUser = await db.getUser(uid);
    return res.status(202).json({ success: true, generation: genDoc, creditsRemaining: updatedUser?.credits ?? 0, cost });
  } catch (err: any) {
    const newBalance = await db.restoreCredits(uid, cost, `Refund: Video generation failed (${err.message?.slice(0, 80) || 'unknown error'})`, generationId);
    return res.status(500).json({ error: `Could not start video generation: ${err.message || 'service unavailable'}. Credits restored.`, creditsRestored: cost, currentBalance: newBalance });
  }
});

app.get('/api/generate/video/:id', async (req, res) => {
  const uid = getUserId(req);
  if (uid === 'guest') return res.status(401).json({ error: 'Please sign in.' });
  try {
    const generation = await db.getGeneration(req.params.id);
    if (!generation || generation.uid !== uid) return res.status(404).json({ error: 'Video generation not found.' });
    if (generation.status === 'completed') return res.json({ success: true, status: 'completed', generation });
    if (generation.status === 'failed') return res.json({ success: false, status: 'failed', generation });
    if (!generation.providerOperationName) return res.status(500).json({ error: 'Video operation is missing.' });

    const operation = await getVideoOperation(generation.providerOperationName);
    if (!operation.done) return res.json({ success: true, status: 'processing', generation });
    if (operation.error) {
      const user = await db.getUser(uid);
      if (generation.status === 'processing') {
        const newBalance = await db.restoreCredits(uid, generation.creditsUsed, `Refund: Video generation failed (${String(operation.error.message || 'Veo error').slice(0, 80)})`, generation.generationId);
        const failed = { ...generation, status: 'failed' as const, providerOperationName: undefined };
        await db.saveGeneration(failed);
        return res.json({ success: false, status: 'failed', generation: failed, creditsRestored: generation.creditsUsed, currentBalance: newBalance, error: operation.error.message || 'Veo generation failed.' });
      }
      return res.json({ success: false, status: 'failed', generation, error: operation.error.message || 'Veo generation failed.' });
    }

    const videoUri = extractVideoUri(operation);
    if (!videoUri) throw new Error('Veo finished but did not return a video file.');

    // Google-hosted Veo files are temporary. Persist the MP4 in the user's
    // Firebase Storage folder before marking the generation complete.
    const stored = await persistVideoToStorage(videoUri, uid, generation.generationId);
    const completed = {
      ...generation,
      status: 'completed' as const,
      mediaUrl: stored.storageUrl,
      storageUrl: stored.storageUrl,
      providerVideoUri: undefined,
      storagePath: stored.storagePath,
      providerOperationName: undefined,
      resolution: 'Veo 3.1'
    };
    await db.saveGeneration(completed);
    return res.json({ success: true, status: 'completed', generation: completed });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Could not check video status.' });
  }
});

app.get('/api/generate/video/file/:id', async (req, res) => {
  const uid = getUserId(req);
  if (uid === 'guest') return res.status(401).json({ error: 'Please sign in.' });
  try {
    const generation = await db.getGeneration(req.params.id);
    if (!generation || generation.uid !== uid || generation.mediaType !== 'video') {
      return res.status(404).json({ error: 'Video file not found.' });
    }
    if (generation.storagePath) {
      await streamStoredVideo(generation.storagePath, res);
      return;
    }
    // Backward compatibility for older generations that were not yet copied
    // into Firebase Storage.
    if (!generation.providerVideoUri) return res.status(404).json({ error: 'Video file is no longer available.' });
    const file = await downloadVideo(generation.providerVideoUri);
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Length', file.body.length.toString());
    res.setHeader('Cache-Control', 'private, max-age=3600');
    return res.send(file.body);
  } catch (err: any) {
    return res.status(502).json({ error: err.message || 'Unable to retrieve video file.' });
  }
});

// --- AUDIO GENERATION (TEXT TO SPEECH / MUSIC) ---

app.post('/api/generate/audio', async (req, res) => {
  const uid = getUserId(req);
  if (uid === 'guest') {
    return res.status(401).json({ error: 'Please sign in to generate audio.' });
  }

  const {
    prompt,
    type = 'speech',
    voice = 'studio_female',
    genre = 'cinematic',
    projectId
  } = req.body;

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return res.status(400).json({ error: 'Please enter audio text or prompt.' });
  }

  const safety = checkContentSafety(prompt);
  if (safety.status === 'blocked') {
    return res.status(400).json({
      error: `Generation blocked: ${safety.reason}`,
      moderation: safety
    });
  }

  let user: Awaited<ReturnType<typeof db.getUser>>;
  let cost: number;
  let reservation: Awaited<ReturnType<typeof db.reserveCredits>>;
  try {
    user = await db.getUser(uid);
    const isAdmin = user?.role === 'admin';
    cost = isAdmin ? 0 : 8;
    reservation = await db.reserveCredits(
      uid,
      cost,
      `Audio Generation: ${type} (${type === 'music' ? genre : voice})`
    );
  } catch (err: any) {
    return res.status(500).json({ error: `Could not start generation: ${err.message || 'service unavailable'}` });
  }

  if (!reservation.success) {
    return res.status(402).json({
      error: `Insufficient credits. Audio generation requires ${cost} credits, but you have ${reservation.balanceBefore}.`,
      requiredCredits: cost,
      currentBalance: reservation.balanceBefore
    });
  }

  const generationId = `aud_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  try {
    const result = await generateAudioWithGemini({
      prompt: prompt.trim(),
      type,
      voice,
      genre
    });

    const genDoc = {
      generationId,
      uid,
      prompt: prompt.trim(),
      model: result.modelUsed,
      aspectRatio: '1:1',
      resolution: '48kHz High-Fidelity Audio',
      imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
      mediaType: 'audio' as const,
      mediaUrl: result.audioUrl,
      duration: `${result.durationSeconds}s`,
      audioVoice: result.voiceOrGenre,
      creditsUsed: cost,
      status: 'completed' as const,
      createdAt: new Date().toISOString(),
      isPublic: false,
      likes: 0,
      likedBy: [],
      authorName: user?.displayName || 'Creator',
      projectId: projectId || undefined
    };

    await db.saveGeneration(genDoc);
    const updatedUser = await db.getUser(uid);

    return res.json({
      success: true,
      generation: genDoc,
      creditsRemaining: updatedUser?.credits ?? 0,
      cost
    });
  } catch (err: any) {
    const newBalance = await db.restoreCredits(
      uid,
      cost,
      `Refund: Audio generation failed (${err.message?.slice(0, 40) || 'unknown error'})`,
      generationId
    );
    return res.status(500).json({
      error: `Audio generation failed: ${err.message || 'Service temporarily unavailable'}. Credits restored.`,
      creditsRestored: cost,
      currentBalance: newBalance
    });
  }
});

// --- GENERATION ACTIONS ---

app.delete('/api/generations/:id', async (req, res) => {
  try {
    const uid = getUserId(req);
    const id = req.params.id as string;
    const generation = await db.getGeneration(id);
    const deleted = await db.deleteGeneration(id, uid);
    if (!deleted) {
      return res.status(404).json({ error: 'Generation not found or unauthorized' });
    }
    // Clean up Firebase Storage file for Veo videos.
    if (generation?.storagePath && generation.mediaType === 'video') {
      await deleteStoredVideo(generation.storagePath).catch(err => console.warn('Video storage cleanup failed:', err));
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/generations/:id/project', async (req, res) => {
  try {
    const uid = getUserId(req);
    if (uid === 'guest') return res.status(401).json({ error: 'Please sign in.' });
    const id = req.params.id as string;
    const { projectId } = req.body;
    const updated = await db.assignGenerationToProject(id, uid, projectId || null);
    res.json({ success: true, generation: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- EXPLORE / COMMUNITY ---

app.get('/api/explore', async (req, res) => {
  try {
    const items = await db.getPublicGenerations();
    res.json({ items });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/explore/:id/like', async (req, res) => {
  try {
    const uid = getUserId(req);
    if (uid === 'guest') {
      return res.status(401).json({ error: 'Please sign in to like creations.' });
    }
    const id = req.params.id as string;
    const result = await db.toggleLikeGeneration(id, uid);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/explore/:id/publish', async (req, res) => {
  try {
    const uid = getUserId(req);
    if (uid === 'guest') {
      return res.status(401).json({ error: 'Please sign in.' });
    }
    const id = req.params.id as string;
    const { isPublic } = req.body;
    const gen = await db.setGenerationPublic(id, uid, Boolean(isPublic));
    res.json({ success: true, generation: gen });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/report', async (req, res) => {
  try {
    const uid = getUserId(req);
    const { generationId, reason } = req.body;
    if (!generationId || !reason) {
      return res.status(400).json({ error: 'generationId and reason are required.' });
    }
    const report = await db.createReport(uid, generationId, reason);
    res.json({ success: true, report });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- PROJECTS ---

app.get('/api/projects', async (req, res) => {
  try {
    const uid = getUserId(req);
    if (uid === 'guest') return res.status(401).json({ error: 'Please sign in.' });
    const projects = await db.getUserProjects(uid);
    res.json({ projects });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/projects', async (req, res) => {
  try {
    const uid = getUserId(req);
    if (uid === 'guest') return res.status(401).json({ error: 'Please sign in.' });
    const { name, description, coverImage } = req.body;
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Project name is required.' });
    }
    const project = await db.createProject(uid, name.trim(), description || '', coverImage);
    res.json({ project });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/projects/:id', async (req, res) => {
  try {
    const uid = getUserId(req);
    const id = req.params.id as string;
    const deleted = await db.deleteProject(id, uid);
    if (!deleted) return res.status(404).json({ error: 'Project not found or unauthorized' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- FAVORITES ---

app.get('/api/favorites', async (req, res) => {
  try {
    const uid = getUserId(req);
    if (uid === 'guest') return res.status(401).json({ error: 'Please sign in.' });
    const favorites = await db.getUserFavorites(uid);
    res.json({ favorites });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/favorites', async (req, res) => {
  try {
    const uid = getUserId(req);
    if (uid === 'guest') return res.status(401).json({ error: 'Please sign in.' });
    const { generationId } = req.body;
    if (!generationId) return res.status(400).json({ error: 'generationId required.' });
    const favorited = await db.toggleFavorite(uid, generationId);
    res.json({ success: true, favorited });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- RAZORPAY PAYMENTS & SUBSCRIPTIONS ---

app.post('/api/payments/create-order', async (req, res) => {
  try {
    const uid = getUserId(req);
    if (uid === 'guest') {
      return res.status(401).json({ error: 'Please sign in to make purchases.' });
    }

    if (!isRazorpayConfigured()) {
      return res.status(503).json({
        error: 'Payments are not configured yet. Configure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to accept live payments.',
        configured: false
      });
    }

    const { productId, type } = req.body; // type: 'pack' | 'subscription'
    if (!productId || !type) {
      return res.status(400).json({ error: 'productId and type are required.' });
    }

    const orderData = await createRazorpayOrder({ productId, type, uid });
    res.json(orderData);
  } catch (err: any) {
    console.error('Order creation error:', err);
    res.status(500).json({ error: err.message || 'Failed to create payment order.' });
  }
});

app.post('/api/payments/verify', async (req, res) => {
  try {
    const uid = getUserId(req);
    if (uid === 'guest') {
      return res.status(401).json({ error: 'Please sign in.' });
    }

    if (!isRazorpayConfigured()) {
      return res.status(503).json({ error: 'Payments are not configured yet.' });
    }

    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      productId,
      type
    } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ error: 'Missing payment signature verification parameters.' });
    }

    // 1. Prevent duplicate crediting
    const existingPayment = await db.getPaymentByOrderId(razorpayOrderId);
    if (existingPayment && existingPayment.status === 'success') {
      return res.status(400).json({ error: 'Payment already processed.' });
    }

    // 2. Confirm the Razorpay order itself matches the authenticated user and requested product.
    const order = await getRazorpayOrder(razorpayOrderId);
    const expectedUid = String(order?.notes?.uid || '');
    const expectedProduct = String(order?.notes?.productId || '');
    const expectedType = String(order?.notes?.type || '');
    if (expectedUid !== uid || expectedProduct !== String(productId || '') || expectedType !== String(type || '')) {
      return res.status(400).json({ error: 'Payment order details do not match this account or product.' });
    }

    // 3. Cryptographic signature check
    const isValid = verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!isValid) {
      await db.recordPayment({
        paymentId: `pay_${Date.now()}`,
        uid,
        razorpayOrderId,
        razorpayPaymentId,
        amount: 0,
        currency: 'INR',
        product: productId || 'unknown',
        status: 'failed',
        createdAt: new Date().toISOString()
      });
      return res.status(400).json({ error: 'Payment verification failed. Invalid signature.' });
    }

    // 4. Process credits / plan upgrade server-side
    let creditsToAdd = 0;
    let planToUpgrade: 'creator' | 'pro' | null = null;
    let amountPaidINR = 0;

    if (type === 'pack') {
      const pack = SERVER_CONFIG.creditPacks[productId as keyof typeof SERVER_CONFIG.creditPacks];
      if (pack) {
        creditsToAdd = pack.credits;
        amountPaidINR = pack.priceINR;
      }
    } else if (type === 'subscription') {
      if (productId === 'sub_creator') {
        planToUpgrade = 'creator';
        creditsToAdd = SERVER_CONFIG.plans.creator.monthlyCredits;
        amountPaidINR = SERVER_CONFIG.plans.creator.priceINR;
      } else if (productId === 'sub_pro') {
        planToUpgrade = 'pro';
        creditsToAdd = SERVER_CONFIG.plans.pro.monthlyCredits;
        amountPaidINR = SERVER_CONFIG.plans.pro.priceINR;
      }
    }

    const paymentDocId = `pay_${Date.now()}`;
    await db.recordPayment({
      paymentId: paymentDocId,
      uid,
      razorpayOrderId,
      razorpayPaymentId,
      amount: amountPaidINR,
      currency: 'INR',
      product: productId,
      status: 'success',
      createdAt: new Date().toISOString()
    });

    if (planToUpgrade) {
      await db.updateUser(uid, { plan: planToUpgrade });
    }

    const newCredits = await db.addCredits(
      uid,
      creditsToAdd,
      `Payment: ${productId} (${razorpayPaymentId})`,
      paymentDocId,
      type === 'subscription' ? 'subscription' : 'purchase'
    );

    const updatedUser = await db.getUser(uid);

    res.json({
      success: true,
      message: 'Payment verified and credits updated successfully!',
      user: updatedUser,
      creditsAdded: creditsToAdd,
      newBalance: newCredits
    });
  } catch (err: any) {
    console.error('Payment verification error:', err);
    res.status(500).json({ error: err.message || 'Payment verification failed.' });
  }
});

// --- ADMIN DASHBOARD & CONTROLS ---

const verifyAdmin = requireAdmin;

app.get('/api/admin/stats', verifyAdmin, async (req, res) => {
  try {
    const stats = await db.getAdminStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/users', verifyAdmin, async (req, res) => {
  try {
    const users = await db.getAllUsers();
    res.json({ users });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/users/:uid/credits', verifyAdmin, async (req, res) => {
  try {
    const uid = req.params.uid as string;
    const { amount, reason = 'Admin Adjustment' } = req.body;
    if (typeof amount !== 'number') {
      return res.status(400).json({ error: 'Amount must be a number.' });
    }
    const newBalance = await db.addCredits(uid, amount, reason, undefined, 'bonus');
    const updatedUser = await db.getUser(uid);
    res.json({ success: true, user: updatedUser, balance: newBalance });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/users/:uid/plan', verifyAdmin, async (req, res) => {
  try {
    const uid = req.params.uid as string;
    const { plan } = req.body;
    if (!['free', 'creator', 'pro'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan.' });
    }
    const updatedUser = await db.updateUser(uid, { plan });
    res.json({ success: true, user: updatedUser });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/users/:uid/suspend', verifyAdmin, async (req, res) => {
  try {
    const uid = req.params.uid as string;
    const { suspended } = req.body;
    const updatedUser = await db.updateUser(uid, { suspended: Boolean(suspended) });
    res.json({ success: true, user: updatedUser });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/reports', verifyAdmin, async (req, res) => {
  try {
    const reports = await db.getReports();
    res.json({ reports });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/reports/:id/resolve', verifyAdmin, async (req, res) => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;
    await db.resolveReport(id, status);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- FRONTEND INTEGRATION (Vite dev middleware or static dist) ---

async function startServer() {
  if (!isProd) {
    // Development mode: attach Vite middleware
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
      root: rootDir
    });
    app.use(vite.middlewares);
  } else if (!isVercel) {
    // Production mode: serve static build (skipped on Vercel — Vercel serves
    // the static dist/ output itself and routes /api/* to the serverless function).
    const distPath = path.resolve(rootDir, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  const port = SERVER_CONFIG.port;
  app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 KANTHI AI fullstack platform running on http://0.0.0.0:${port}`);
    console.log(`✨ Gemini AI: ${SERVER_CONFIG.hasGeminiKey ? 'Active & Ready' : 'Key missing (configure GEMINI_API_KEY)'}`);
    console.log(`💳 Razorpay: ${isRazorpayConfigured() ? 'Active & Ready' : 'Key missing (configure RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET)'}`);
  });
}

// Only auto-start a listener when this file is executed directly
// (e.g. `node dist-server/index.js`) and not on Vercel serverless, where
// api/index.ts imports the app without a listener.
const isMainEntry =
  process.argv[1] != null && import.meta.url === pathToFileURL(process.argv[1]).href;

if (!isVercel && isMainEntry) {
  startServer().catch(err => {
    console.error('Failed to start KANTHI AI server:', err);
    process.exit(1);
  });
}
