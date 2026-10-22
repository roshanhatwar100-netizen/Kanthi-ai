import dotenv from 'dotenv';
dotenv.config();

export const SERVER_CONFIG = {
  port: parseInt(process.env.PORT || '3000', 10),
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  hasGeminiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 5),
  
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || '',
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  hasRazorpayConfigured: Boolean(
    Boolean(process.env.RAZORPAY_KEY_ID) &&
    Boolean(process.env.RAZORPAY_KEY_SECRET)
  ),

  // Credit costs for image generation (Configurable single source of truth)
  creditCosts: {
    '1K': 5,
    '2K': 10,
    '4K': 15,
  } as Record<string, number>,

  // Base plan definitions
  plans: {
    free: {
      name: 'Free',
      id: 'free',
      priceINR: 0,
      monthlyCredits: 50,
      features: ['50 starter credits', 'Basic generation', 'Personal projects', 'Standard queue']
    },
    creator: {
      name: 'Creator',
      id: 'creator',
      priceINR: 299,
      monthlyCredits: 400,
      features: ['400 monthly credits', 'Higher limits', 'Projects & collections', 'Priority generation', 'Commercial creation']
    },
    pro: {
      name: 'Pro',
      id: 'pro',
      priceINR: 799,
      monthlyCredits: 1000,
      features: ['1,000 monthly credits', 'Highest concurrency', 'Priority 4K generation', 'Advanced features', 'Commercial creation']
    }
  },

  // Credit top-up packs
  creditPacks: {
    pack_100: { id: 'pack_100', credits: 100, priceINR: 99, name: '100 Credits' },
    pack_400: { id: 'pack_400', credits: 400, priceINR: 299, name: '400 Credits' },
    pack_1500: { id: 'pack_1500', credits: 1500, priceINR: 999, name: '1,500 Credits' },
  },

  adminUids: (process.env.ADMIN_UIDS || '').split(',').map(v => v.trim()).filter(Boolean),
  adminEmails: (process.env.ADMIN_EMAILS || '').split(',').map(v => v.trim().toLowerCase()).filter(Boolean),

  supportedModels: [
    {
      id: 'gemini-3.1-flash-image-preview',
      name: 'Gemini 3.1 Flash Image',
      description: 'Latest high-fidelity image generator with multi-resolution 1K/2K/4K support',
      recommended: true,
      category: 'flagship',
      supportedAspectRatios: ['1:1', '16:9', '9:16', '4:3'],
      resolutions: ['1K', '2K', '4K']
    },
    {
      id: 'gemini-3.1-flash-lite-image',
      name: 'Gemini 3.1 Flash-Lite Image',
      description: 'Ultra-fast lightweight creation optimized for rapid ideation and prototyping',
      recommended: false,
      category: 'fast',
      supportedAspectRatios: ['1:1', '16:9', '9:16', '4:3'],
      resolutions: ['1K']
    },
    {
      id: 'imagen-3.0-generate-002',
      name: 'Imagen 3 Core',
      description: 'Photorealistic Google Imagen engine with deep stylistic rendering',
      recommended: false,
      category: 'photoreal',
      supportedAspectRatios: ['1:1', '16:9', '9:16', '4:3'],
      resolutions: ['1K']
    }
  ]
};
