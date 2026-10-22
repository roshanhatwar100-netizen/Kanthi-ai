export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  credits: number;
  plan: 'free' | 'creator' | 'pro';
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
  creditsUsed: number;
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

export interface CreditTransaction {
  transactionId: string;
  uid: string;
  type: 'purchase' | 'generation' | 'refund' | 'bonus' | 'subscription';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reason: string;
  generationId?: string;
  paymentId?: string;
  createdAt: string;
}

export interface PlanConfig {
  id: 'free' | 'creator' | 'pro';
  name: string;
  priceINR: number;
  monthlyCredits: number;
  features: string[];
}

export interface CreditPackConfig {
  id: string;
  name: string;
  credits: number;
  priceINR: number;
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
  hasRazorpayConfigured: boolean;
  razorpayKeyId?: string | null;
  creditCosts: Record<string, number>;
  plans: Record<string, PlanConfig>;
  creditPacks: Record<string, CreditPackConfig>;
  supportedModels: ModelConfig[];
}
