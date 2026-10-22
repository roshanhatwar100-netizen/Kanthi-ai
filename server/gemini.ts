import { SERVER_CONFIG } from './config.js';
import sharp from 'sharp';

/**
 * Thrown when a generation request is refused on safety grounds
 * (server-side moderation or the provider's NSFW filter). The cascade
 * must fail closed on this — never hand a refused prompt to the next model.
 */
export class ContentNotAllowedError extends Error {
  constructor(message = 'This content is not allowed. Please try a different prompt.') {
    super(message);
    this.name = 'ContentNotAllowedError';
  }
}

/**
 * Pollinations stamps a small logo band along the bottom edge of generated
 * images. `nologo=true` + Bearer auth did NOT remove it in testing, so every
 * Pollinations image gets its bottom band cropped server-side before it is
 * handed to the user. Same approach as the Kanto batch cleanup.
 */
async function stripWatermarkBand(buf: Buffer): Promise<Buffer> {
  try {
    const meta = await sharp(buf).metadata();
    const w = meta.width || 0;
    const h = meta.height || 0;
    if (!w || !h) return buf;
    const cropHeight = Math.floor(h * 0.95);
    if (cropHeight < 10) return buf;
    return await sharp(buf)
      .extract({ left: 0, top: 0, width: w, height: cropHeight })
      .jpeg({ quality: 92 })
      .toBuffer();
  } catch {
    // If the image can't be parsed/cropped, return it untouched rather than
    // failing the whole generation.
    return buf;
  }
}

interface EnhancePromptResponse {
  enhancedPrompt: string;
  breakdown: {
    subject?: string;
    environment?: string;
    composition?: string;
    lighting?: string;
    camera?: string;
    style?: string;
    mood?: string;
    details?: string;
  };
}

interface GenerateImageParams {
  prompt: string;
  negativePrompt?: string;
  model: string;
  aspectRatio: string;
  resolution: string;
}

// Creative fallback synthesizer if Google text models experience temporary 503 high demand
function synthesizeEnhancedPrompt(userPrompt: string): EnhancePromptResponse {
  const clean = userPrompt.trim();
  const subject = clean.charAt(0).toUpperCase() + clean.slice(1);
  const environment = 'surrounded by an atmospheric cinematic backdrop with subtle volumetric mist and golden hour radiance';
  const composition = 'rule-of-thirds framing, centered focal depth, striking golden ratio perspective';
  const lighting = 'chiaroscuro volumetric god rays, soft rim highlights, warm ambient fill with neon accents';
  const camera = 'shot on 35mm f/1.4 prime lens, ultra-sharp optical fidelity, shallow depth of field, IMAX quality';
  const style = 'hyper-detailed digital masterpiece, award-winning concept art, octane render 8k';
  const mood = 'evocative, awe-inspiring, mysterious, emotionally charged';
  const details = 'micro-textures on fabrics and surfaces, fine particle physics, lifelike reflections, pristine dynamic range';

  const masterPrompt = `${subject}, ${environment}, ${lighting}, ${camera}, ${style}, ${details}`;

  return {
    enhancedPrompt: masterPrompt,
    breakdown: {
      subject,
      environment,
      composition,
      lighting,
      camera,
      style,
      mood,
      details
    }
  };
}

export async function enhancePromptWithGemini(userPrompt: string): Promise<EnhancePromptResponse> {
  const apiKey = SERVER_CONFIG.geminiApiKey;
  if (!apiKey) {
    throw new Error('Gemini API key is not configured.');
  }

  const systemInstruction = `You are KANTHI AI's master creative director and prompt enhancer.
Given a user's creative prompt, analyze and elevate it by expanding into:
- subject: Primary character, object, or focal point
- environment: World setting, background scenery, atmosphere
- composition: Rule of thirds, golden ratio, framing, perspective
- lighting: Volumetric rays, cinematic chiaroscuro, golden hour, neon rim light
- camera: 35mm lens, f/1.4 aperture, IMAX depth of field, macro/wide angle
- style: Hyper-detailed digital art, photorealistic, cinematic anime, etc.
- mood: Emotional resonance, intensity, wonder
- details: Micro-textures, particle physics, skin/fabric fidelity

Combine all these dimensions into ONE single, masterfully described paragraph (around 70-120 words) suitable for ultra-high-end image rendering.
Also provide the breakdown JSON.

Respond in JSON format only:
{
  "enhancedPrompt": "The full polished masterpiece prompt...",
  "breakdown": {
    "subject": "...",
    "environment": "...",
    "composition": "...",
    "lighting": "...",
    "camera": "...",
    "style": "...",
    "mood": "...",
    "details": "..."
  }
}`;

  // Live text models discovered in container environment
  const textModels = [
    'gemini-3.5-flash-lite',
    'gemini-flash-latest',
    'gemini-3.5-flash',
    'gemini-2.5-flash-lite'
  ];

  for (const model of textModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemInstruction}\n\nUser prompt to enhance: "${userPrompt}"` }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            responseMimeType: 'application/json'
          }
        })
      });

      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        const contentText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (contentText) {
          const cleanedJson = contentText.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
          const parsed = JSON.parse(cleanedJson);
          return {
            enhancedPrompt: parsed.enhancedPrompt || userPrompt,
            breakdown: parsed.breakdown || {}
          };
        }
      }
    } catch (err: any) {
      // Continue to next model
    }
  }

  // Gracefully synthesize enhanced prompt if external models report 503 high demand
  return synthesizeEnhancedPrompt(userPrompt);
}

export async function generateImageWithGemini(params: GenerateImageParams): Promise<{ imageUrl: string; modelUsed: string }> {
  const apiKey = SERVER_CONFIG.geminiApiKey;
  if (!apiKey) {
    throw new Error('Gemini API key is not configured on the server. Please check GEMINI_API_KEY.');
  }

  const { prompt, negativePrompt, model, aspectRatio, resolution } = params;
  const validAspectRatios = ['1:1', '16:9', '9:16', '4:3', '3:4'];
  const formattedAspectRatio = validAspectRatios.includes(aspectRatio) ? aspectRatio : '1:1';

  // Strategy 0 (free, no key): Pollinations.ai — works without billing.
  // Used first; Gemini attempts below serve as fallback if billing is enabled.
  const tryPollinations = async (): Promise<string> => {
    const dims: Record<string, { w: number; h: number }> = {
      '1:1': { w: 1024, h: 1024 },
      '16:9': { w: 1280, h: 720 },
      '9:16': { w: 720, h: 1280 },
      '4:3': { w: 1024, h: 768 },
      '3:4': { w: 768, h: 1024 }
    };
    // NOTE: Pollinations free tier caps output at ~576x1024 regardless of
    // requested size. Higher-res output needs Gemini billing (imagen).
    const { w, h } = dims[formattedAspectRatio] || dims['1:1'];
    const seed = Math.floor(Math.random() * 1000000);
    // Quality booster: appended server-side so every generation gets
    // sharper, more detailed output. `enhance=true` lets Pollinations'
    // LLM refine the prompt further (free).
    const qualityPrompt =
      `${prompt}, ultra detailed, sharp focus, professional photography, ` +
      `high resolution, crisp details, vibrant colors, cinematic lighting`;
    const url =
      `https://image.pollinations.ai/prompt/${encodeURIComponent(qualityPrompt)}` +
      `?width=${w}&height=${h}&nologo=true&safe=true&seed=${seed}&model=flux&enhance=true`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);
    try {
      // Authenticated requests (POLLINATIONS_API_KEY) raise rate limits.
      // NOTE: nologo+auth did NOT remove the watermark in testing, so the
      // returned image is cropped server-side (stripWatermarkBand) below.
      // `safe=true` enables strict NSFW filtering — flagged prompts fail here
      // and must fail closed (ContentNotAllowedError), never cascading onward.
      const headers: Record<string, string> = {};
      const pollenKey = process.env.POLLINATIONS_API_KEY;
      if (pollenKey) headers['Authorization'] = `Bearer ${pollenKey}`;
      const response = await fetch(url, { signal: controller.signal, headers });
      if (!response.ok) {
        const bodyText = await response.text().catch(() => '');
        const looksLikeSafetyRefusal =
          response.status === 400 ||
          response.status === 403 ||
          response.status === 422 ||
          /nsfw|inappropriate|flagged|safety|not allowed|blocked|prohibited|content policy/i.test(
            bodyText
          );
        if (looksLikeSafetyRefusal) throw new ContentNotAllowedError();
        throw new Error(`Pollinations error (${response.status})`);
      }
      const buf = Buffer.from(await response.arrayBuffer());
      if (buf.length < 5000) throw new Error('Pollinations returned an empty image');
      const clean = await stripWatermarkBand(buf);
      return `data:image/jpeg;base64,${clean.toString('base64')}`;
    } finally {
      clearTimeout(timeout);
    }
  };

  // Strategy 1: Imagen 3 Predict endpoint
  const tryImagenPredict = async (modelName: string) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:predict?key=${apiKey}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        instances: [
          {
            prompt: `${prompt}${resolution ? ` (${resolution} resolution masterwork)` : ''}`
          }
        ],
        parameters: {
          sampleCount: 1,
          aspectRatio: formattedAspectRatio,
          negativePrompt: negativePrompt || undefined,
          personGeneration: 'ALLOW_ADULT'
        }
      })
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const err = await response.text();
      if (response.status === 429) {
        throw new Error('Google Gemini Quota Exceeded (RESOURCE_EXHAUSTED). Free tier quota limit is reached on your API key.');
      }
      throw new Error(`Imagen API error (${response.status}): ${err}`);
    }

    const data = await response.json();
    const prediction = data.predictions?.[0];
    if (prediction?.bytesBase64Encoded) {
      const mime = prediction.mimeType || 'image/png';
      return `data:${mime};base64,${prediction.bytesBase64Encoded}`;
    }
    throw new Error('No image bytes in Imagen response');
  };

  // Strategy 2: Google Gen AI multimodal image generation / generateContent endpoint
  const tryGeminiGenerateContent = async (modelName: string) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Generate an image with aspect ratio ${formattedAspectRatio}, ${resolution} quality: ${prompt}${negativePrompt ? `. Avoid: ${negativePrompt}` : ''}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 1.0
        }
      })
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const err = await response.text();
      if (response.status === 429) {
        throw new Error('Google Gemini API quota reached: The Free tier daily/project quota for image generation is currently 0 or exhausted on this key. Please configure a paid Gemini tier with billing.');
      }
      throw new Error(`Gemini generateContent error (${response.status}): ${err}`);
    }

    const data = await response.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        const mime = part.inlineData.mimeType || 'image/jpeg';
        return `data:${mime};base64,${part.inlineData.data}`;
      }
    }
    throw new Error('No inline image data in Gemini response');
  };

  // Build sequence of available models — free Pollinations first (no billing
  // needed), then Gemini models as fallback (these need billing enabled).
  const attempts: Array<() => Promise<{ url: string; model: string }>> = [];

  attempts.push(async () => ({ url: await tryPollinations(), model: 'pollinations-flux' }));

  const targetModel = model.replace('-preview', '');
  const seen = new Set<string>();
  const candidates = [
    targetModel,
    `${targetModel}-preview`,
    model,
    'gemini-2.5-flash-image',
    'gemini-2.0-flash-preview-image-generation'
  ];
  for (const m of candidates) {
    if (!m || seen.has(m)) continue;
    seen.add(m);
    const modelName = m;
    attempts.push(async () => ({ url: await tryGeminiGenerateContent(modelName), model: modelName }));
  }

  let lastError: Error | null = null;
  for (const attempt of attempts) {
    try {
      const result = await attempt();
      return { imageUrl: result.url, modelUsed: result.model };
    } catch (err: any) {
      lastError = err;
      // Safety refusal: fail closed immediately. Never hand a refused prompt
      // to the next model in the cascade.
      if (err instanceof ContentNotAllowedError || err?.name === 'ContentNotAllowedError') {
        throw err;
      }
      // If it's a 429 quota exhaustion, stop looping and inform the user immediately
      if (err.message && err.message.includes('quota')) {
        break;
      }
    }
  }

  throw lastError || new Error('Image generation could not be completed with current models.');
}
