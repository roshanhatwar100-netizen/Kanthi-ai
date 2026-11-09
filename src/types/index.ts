export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'user' | 'admin';
  createdAt: string;
  updatedAt?: string;
  suspended?: boolean;
}

export interface Generation {
  generationId: string;
  uid: string;
  prompt: string;
  negativePrompt?: string;
  model: string;
  aspectRatio: string;
  resolution: string;
  imageUrl: string;
  mediaType?: 'image' | 'video' | 'audio';
  mediaUrl?: string;
  duration?: string;
  audioVoice?: string;
  status: 'completed' | 'failed' | 'processing';
  createdAt: string;
  isPublic?: boolean;
  likes?: number;
  likedBy?: string[];
  authorName?: string;
  projectId?: string;
}

export interface Project {
  id: string;
  uid: string;
  name: string;
  description: string;
  coverImage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ModelConfig {
  id: string;
  name: string;
  description: string;
  recommended: boolean;
  category: string;
  supportedAspectRatios: string[];
  resolutions: string[];
}

export interface ServerConfig {
  appName: string;
  tagline: string;
  hasGeminiKey: boolean;
  supportedModels: ModelConfig[];
}
