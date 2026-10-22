import { SERVER_CONFIG } from './config.js';
import { getStorageBucket } from './auth.js';
import crypto from 'node:crypto';

export type VideoDuration = '4s' | '6s' | '8s';

export interface GenerateVideoParams {
  prompt: string;
  negativePrompt?: string;
  model: string;
  aspectRatio: '16:9' | '9:16';
  duration: VideoDuration | string;
  motionSpeed?: 'smooth' | 'dynamic' | 'cinematic';
  style?: string;
}

export interface VideoOperation {
  operationName: string;
  modelUsed: string;
}

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

function modelName(model: string) {
  return model.includes('veo-3.1') ? model : 'veo-3.1-generate-preview';
}

function seconds(duration: string): number {
  if (duration === '4s') return 4;
  if (duration === '6s') return 6;
  return 8;
}

export async function startVideoGeneration(params: GenerateVideoParams): Promise<VideoOperation> {
  const apiKey = SERVER_CONFIG.geminiApiKey;
  if (!apiKey) throw new Error('Gemini API key is not configured on the server.');

  const model = modelName(params.model);
  const prompt = [
    params.prompt.trim(),
    params.style ? `${params.style} visual style.` : '',
    params.motionSpeed === 'smooth' ? 'Smooth, controlled camera movement.' : '',
    params.motionSpeed === 'dynamic' ? 'Dynamic camera movement and energetic motion.' : '',
    params.motionSpeed === 'cinematic' ? 'Cinematic camera movement and natural motion.' : '',
  ].filter(Boolean).join(' ');

  const body: any = {
    instances: [{ prompt }],
    parameters: {
      aspectRatio: params.aspectRatio,
      durationSeconds: seconds(params.duration),
    }
  };
  if (params.negativePrompt?.trim()) body.parameters.negativePrompt = params.negativePrompt.trim();

  const response = await fetch(`${BASE_URL}/models/${model}:predictLongRunning`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(body),
  });

  const data: any = await response.json().catch(() => ({}));
  if (!response.ok || !data.name) {
    const detail = data?.error?.message || `Veo request failed with HTTP ${response.status}`;
    throw new Error(detail);
  }

  return { operationName: data.name, modelUsed: model };
}

export async function getVideoOperation(operationName: string): Promise<any> {
  const apiKey = SERVER_CONFIG.geminiApiKey;
  if (!apiKey) throw new Error('Gemini API key is not configured on the server.');

  const response = await fetch(`${BASE_URL}/${operationName}`, {
    headers: { 'x-goog-api-key': apiKey },
  });
  const data: any = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || `Veo status request failed with HTTP ${response.status}`);
  return data;
}

export function extractVideoUri(operation: any): string | null {
  return operation?.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri
    || operation?.response?.generatedVideos?.[0]?.video?.uri
    || operation?.result?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri
    || null;
}

export async function downloadVideo(videoUri: string): Promise<{ body: Buffer; contentType: string }> {
  const apiKey = SERVER_CONFIG.geminiApiKey;
  const response = await fetch(videoUri, { headers: { 'x-goog-api-key': apiKey } });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Video download failed (${response.status})${text ? `: ${text.slice(0, 200)}` : ''}`);
  }
  return {
    body: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get('content-type') || 'video/mp4',
  };
}


export async function persistVideoToStorage(videoUri: string, uid: string, generationId: string): Promise<{ storagePath: string; storageUrl: string; contentType: string }> {
  const bucket = getStorageBucket();
  if (!bucket) throw new Error('Firebase Storage is not configured on the server.');
  const file = await downloadVideo(videoUri);
  const storagePath = `users/${uid}/videos/${generationId}.mp4`;
  const object = bucket.file(storagePath);
  const downloadToken = crypto.randomUUID();
  await object.save(file.body, {
    resumable: false,
    metadata: {
      contentType: file.contentType || 'video/mp4',
      cacheControl: 'private, max-age=31536000',
      metadata: { uid, generationId, source: 'google-veo', firebaseStorageDownloadTokens: downloadToken }
    }
  });
  const storageUrl = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket.name)}/o/${encodeURIComponent(storagePath)}?alt=media&token=${encodeURIComponent(downloadToken)}`;
  return { storagePath, storageUrl, contentType: file.contentType || 'video/mp4' };
}

export async function streamStoredVideo(storagePath: string, res: any): Promise<void> {
  const bucket = getStorageBucket();
  if (!bucket) throw new Error('Firebase Storage is not configured on the server.');
  const object = bucket.file(storagePath);
  const [metadata] = await object.getMetadata();
  res.setHeader('Content-Type', metadata.contentType || 'video/mp4');
  if (metadata.size) res.setHeader('Content-Length', String(metadata.size));
  res.setHeader('Cache-Control', 'private, max-age=31536000');
  await new Promise<void>((resolve, reject) => {
    const stream = object.createReadStream();
    stream.on('error', reject);
    stream.on('end', resolve);
    stream.pipe(res);
  });
}

export async function deleteStoredVideo(storagePath?: string): Promise<void> {
  if (!storagePath) return;
  const bucket = getStorageBucket();
  if (!bucket) return;
  await bucket.file(storagePath).delete({ ignoreNotFound: true });
}
