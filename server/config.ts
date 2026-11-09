import dotenv from 'dotenv';
dotenv.config();

export const SERVER_CONFIG = {
  port: parseInt(process.env.PORT || '3000', 10),
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  hasGeminiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 5),

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
