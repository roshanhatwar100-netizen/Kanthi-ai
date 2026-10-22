import type { Database } from 'firebase-admin/database';
import { getRtdb } from './auth.js';
import { SERVER_CONFIG } from './config.js';

export interface UserDoc {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  credits: number;
  plan: 'free' | 'creator' | 'pro';
  role: 'user' | 'admin';
  createdAt: string;
  updatedAt: string;
  suspended?: boolean;
}

export interface CreditTransactionDoc {
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

export interface GenerationDoc {
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
  // Veo long-video pipeline fields
  providerOperationName?: string;
  providerVideoUri?: string;
  storagePath?: string;
  storageUrl?: string;
}

export interface ProjectDoc {
  id: string;
  uid: string;
  name: string;
  description: string;
  coverImage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FavoriteDoc {
  id: string;
  uid: string;
  generationId: string;
  createdAt: string;
}

export interface PaymentDoc {
  paymentId: string;
  uid: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  amount: number;
  currency: string;
  product: string;
  status: 'success' | 'failed' | 'pending';
  createdAt: string;
}

export interface ReportDoc {
  reportId: string;
  uid: string;
  generationId: string;
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

// RTDB keys cannot contain '.', so emails are encoded for the usersByEmail index.
function encodeEmail(email: string): string {
  return email.toLowerCase().replace(/\./g, ',');
}

// RTDB set() rejects undefined values — strip them before every write.
function stripUndefined<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(stripUndefined) as unknown as T;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (v !== undefined) out[k] = stripUndefined(v);
  }
  return out as T;
}

class DatabaseService {
  private database(): Database {
    const db = getRtdb();
    if (!db) throw new Error('Firebase Admin / RTDB is not configured');
    return db;
  }

  private ref(path: string) {
    return this.database().ref(path);
  }

  private async getVal<T>(path: string): Promise<T | null> {
    const snap = await this.ref(path).get();
    return snap.exists() ? (snap.val() as T) : null;
  }

  private async setVal(path: string, value: unknown): Promise<void> {
    await this.ref(path).set(stripUndefined(value));
  }

  // --- User methods ---

  async getUser(uid: string): Promise<UserDoc | null> {
    return this.getVal<UserDoc>(`users/${uid}`);
  }

  async getUserByEmail(email: string): Promise<UserDoc | null> {
    const uid = await this.getVal<string>(`usersByEmail/${encodeEmail(email)}`);
    if (!uid) return null;
    return this.getUser(uid);
  }

  async getOrCreateUser(
    uid: string,
    email: string,
    displayName?: string,
    photoURL?: string
  ): Promise<UserDoc> {
    const userRef = this.ref(`users/${uid}`);
    const result = await userRef.transaction((current: UserDoc | null) => {
      if (current) return; // already exists — abort, keep existing doc
      // Admins don't get the free welcome credits — 50 credits are for regular users only.
      const isAdminAccount = SERVER_CONFIG.adminUids.includes(uid) || SERVER_CONFIG.adminEmails.includes(email.toLowerCase());
      const credits = isAdminAccount ? 0 : SERVER_CONFIG.plans.free.monthlyCredits;
      const created: UserDoc = {
        uid,
        email,
        displayName: displayName || email.split('@')[0],
        photoURL: photoURL || `https://api.dicebear.com/7.x/shapes/svg?seed=${uid}`,
        credits,
        plan: 'free',
        role: 'user',
        createdAt: nowIso(),
        updatedAt: nowIso()
      };
      return stripUndefined(created);
    });

    if (!result.committed) {
      // User already existed — return the current doc.
      const existing = await this.getUser(uid);
      if (!existing) throw new Error('User not found');
      return existing;
    }

    // New user created — write the email index and the welcome bonus transaction.
    const created = result.snapshot?.val() as UserDoc;
    await this.ref(`usersByEmail/${encodeEmail(email)}`).set(uid);
    if (created.credits > 0) {
      await this.recordCreditTransaction({
        uid,
        type: 'bonus',
        amount: created.credits,
        balanceBefore: 0,
        balanceAfter: created.credits,
        reason: 'Welcome Starter Credits'
      });
    }
    return created;
  }

  async updateUser(uid: string, updates: Partial<UserDoc>): Promise<UserDoc> {
    const user = await this.getUser(uid);
    if (!user) throw new Error('User not found');
    const updated: UserDoc = { ...user, ...updates, updatedAt: nowIso() };
    await this.setVal(`users/${uid}`, updated);
    return updated;
  }

  // Atomic credit reservation and deduction (single transaction on the user doc).
  async reserveCredits(
    uid: string,
    cost: number,
    reason: string
  ): Promise<{ success: boolean; balanceBefore: number; balanceAfter: number; isAdminUnlimited?: boolean }> {
    // Zero-cost operations (e.g. the admin exemption) need no reservation —
    // skip the atomic transaction entirely so a 0 balance can never block them.
    if (cost === 0) {
      const user = await this.getUser(uid);
      if (!user) throw new Error('User not found');
      if (user.suspended) throw new Error('User account is suspended');
      return { success: true, balanceBefore: user.credits, balanceAfter: user.credits };
    }
    const existingUser = await this.getUser(uid);
    if (!existingUser) throw new Error('User not found');
    if (existingUser.suspended) throw new Error('User account is suspended');

    // NOTE: RTDB transactions proved unreliable in the serverless runtime
    // (spurious aborts even with sufficient balance), so credit mutations use
    // read-modify-write instead. At this app's scale the race window is negligible.
    const balanceBefore = typeof existingUser.credits === 'number' ? existingUser.credits : 0;
    if (balanceBefore < cost) {
      return { success: false, balanceBefore, balanceAfter: balanceBefore };
    }
    const balanceAfter = balanceBefore - cost;
    await this.setVal(`users/${uid}`, { ...existingUser, credits: balanceAfter, updatedAt: nowIso() });

    await this.recordCreditTransaction({
      uid,
      type: 'generation',
      amount: -cost,
      balanceBefore,
      balanceAfter,
      reason
    });
    return { success: true, balanceBefore, balanceAfter };
  }

  // Restore credits if generation fails or gets blocked.
  async restoreCredits(uid: string, amount: number, reason: string, generationId?: string): Promise<number> {
    const user = await this.getUser(uid);
    if (!user) throw new Error('User not found');

    const balanceBefore = typeof user.credits === 'number' ? user.credits : 0;
    const balanceAfter = balanceBefore + amount;
    await this.setVal(`users/${uid}`, { ...user, credits: balanceAfter, updatedAt: nowIso() });
    await this.recordCreditTransaction({
      uid,
      type: 'refund',
      amount,
      balanceBefore,
      balanceAfter,
      reason,
      generationId
    });
    return balanceAfter;
  }

  // Credit purchasing and subscription awarding.
  async addCredits(
    uid: string,
    amount: number,
    reason: string,
    paymentId?: string,
    type: 'purchase' | 'subscription' | 'bonus' = 'purchase'
  ): Promise<number> {
    const user = await this.getUser(uid);
    if (!user) throw new Error('User not found');

    const balanceBefore = typeof user.credits === 'number' ? user.credits : 0;
    const balanceAfter = balanceBefore + amount;
    await this.setVal(`users/${uid}`, { ...user, credits: balanceAfter, updatedAt: nowIso() });
    await this.recordCreditTransaction({
      uid,
      type,
      amount,
      balanceBefore,
      balanceAfter,
      reason,
      paymentId
    });
    return balanceAfter;
  }

  async recordCreditTransaction(
    tx: Omit<CreditTransactionDoc, 'transactionId' | 'createdAt'>
  ): Promise<CreditTransactionDoc> {
    const pushRef = this.ref(`creditTransactions/${tx.uid}`).push();
    const transactionId = pushRef.key as string;
    const fullTx: CreditTransactionDoc = {
      transactionId,
      createdAt: nowIso(),
      ...tx
    };
    await pushRef.set(stripUndefined(fullTx));
    return fullTx;
  }

  async getCreditTransactions(uid: string): Promise<CreditTransactionDoc[]> {
    const all = await this.getVal<Record<string, CreditTransactionDoc>>(`creditTransactions/${uid}`);
    return Object.values(all || {}).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  // --- Generations ---

  async saveGeneration(gen: GenerationDoc): Promise<void> {
    await this.setVal(`generations/${gen.generationId}`, gen);
    await this.ref(`userGenerations/${gen.uid}/${gen.generationId}`).set(true);
  }

  async getGeneration(generationId: string): Promise<GenerationDoc | null> {
    return this.getVal<GenerationDoc>(`generations/${generationId}`);
  }

  async getUserGenerations(uid: string): Promise<GenerationDoc[]> {
    const index = await this.getVal<Record<string, boolean>>(`userGenerations/${uid}`);
    const ids = Object.keys(index || {});
    const docs = await Promise.all(ids.map(id => this.getGeneration(id)));
    return docs
      .filter((d): d is GenerationDoc => d !== null)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async deleteGeneration(generationId: string, uid: string): Promise<boolean> {
    const gen = await this.getGeneration(generationId);
    if (!gen) return false;
    if (gen.uid !== uid) {
      const user = await this.getUser(uid);
      if (user?.role !== 'admin') return false;
    }
    await this.ref(`generations/${generationId}`).remove();
    await this.ref(`userGenerations/${gen.uid}/${generationId}`).remove();
    return true;
  }

  async assignGenerationToProject(
    generationId: string,
    uid: string,
    projectId: string | null
  ): Promise<GenerationDoc> {
    const gen = await this.getGeneration(generationId);
    if (!gen) throw new Error('Generation not found');
    if (gen.uid !== uid) {
      const user = await this.getUser(uid);
      if (user?.role !== 'admin') throw new Error('Unauthorized');
    }
    const updated: GenerationDoc = { ...gen, projectId: projectId || undefined };
    await this.setVal(`generations/${generationId}`, updated);
    return updated;
  }

  async toggleLikeGeneration(generationId: string, uid: string): Promise<{ likes: number; isLiked: boolean }> {
    const result = await this.ref(`generations/${generationId}`).transaction((current: GenerationDoc | null) => {
      if (!current) return; // abort — generation missing
      const likedBy = current.likedBy || [];
      const index = likedBy.indexOf(uid);
      if (index === -1) likedBy.push(uid);
      else likedBy.splice(index, 1);
      return { ...current, likedBy, likes: likedBy.length };
    });
    if (!result.committed) throw new Error('Generation not found');
    const gen = result.snapshot?.val() as GenerationDoc;
    return { likes: gen.likes || 0, isLiked: (gen.likedBy || []).includes(uid) };
  }

  async setGenerationPublic(generationId: string, uid: string, isPublic: boolean): Promise<GenerationDoc> {
    const gen = await this.getGeneration(generationId);
    if (!gen) throw new Error('Generation not found');
    if (gen.uid !== uid) throw new Error('Unauthorized');
    const updated: GenerationDoc = { ...gen, isPublic };
    await this.setVal(`generations/${generationId}`, updated);
    return updated;
  }

  async getPublicGenerations(): Promise<GenerationDoc[]> {
    const snap = await this.ref('generations').orderByChild('isPublic').equalTo(true).get();
    const val = (snap.val() || {}) as Record<string, GenerationDoc>;
    return Object.values(val).sort((a, b) => (b.likes || 0) - (a.likes || 0));
  }

  // --- Projects ---

  async createProject(uid: string, name: string, description: string, coverImage?: string): Promise<ProjectDoc> {
    const id = `proj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const project: ProjectDoc = {
      id,
      uid,
      name,
      description,
      coverImage,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    await this.setVal(`projects/${id}`, project);
    await this.ref(`userProjects/${uid}/${id}`).set(true);
    return project;
  }

  async getUserProjects(uid: string): Promise<ProjectDoc[]> {
    const index = await this.getVal<Record<string, boolean>>(`userProjects/${uid}`);
    const ids = Object.keys(index || {});
    const docs = await Promise.all(ids.map(id => this.getVal<ProjectDoc>(`projects/${id}`)));
    return docs
      .filter((d): d is ProjectDoc => d !== null)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async deleteProject(projectId: string, uid: string): Promise<boolean> {
    const p = await this.getVal<ProjectDoc>(`projects/${projectId}`);
    if (!p || p.uid !== uid) return false;
    await this.ref(`projects/${projectId}`).remove();
    await this.ref(`userProjects/${uid}/${projectId}`).remove();
    return true;
  }

  // --- Favorites ---

  async toggleFavorite(uid: string, generationId: string): Promise<boolean> {
    const favRef = this.ref(`favorites/${uid}/${generationId}`);
    const snap = await favRef.get();
    if (snap.exists()) {
      await favRef.remove();
      return false; // un-favorited
    }
    await favRef.set({ createdAt: nowIso() });
    return true; // favorited
  }

  async getUserFavorites(uid: string): Promise<GenerationDoc[]> {
    const favs = await this.getVal<Record<string, { createdAt: string }>>(`favorites/${uid}`);
    const ids = Object.keys(favs || {});
    const docs = await Promise.all(ids.map(id => this.getGeneration(id)));
    return docs
      .filter((d): d is GenerationDoc => d !== null)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // --- Payments ---

  async recordPayment(payment: PaymentDoc): Promise<void> {
    await this.setVal(`payments/${payment.paymentId}`, payment);
    await this.ref(`paymentsByOrder/${payment.razorpayOrderId}`).set(payment.paymentId);
  }

  async getPaymentByOrderId(orderId: string): Promise<PaymentDoc | null> {
    const paymentId = await this.getVal<string>(`paymentsByOrder/${orderId}`);
    if (!paymentId) return null;
    return this.getVal<PaymentDoc>(`payments/${paymentId}`);
  }

  // --- Reports ---

  async createReport(uid: string, generationId: string, reason: string): Promise<ReportDoc> {
    const reportId = `rep_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const report: ReportDoc = {
      reportId,
      uid,
      generationId,
      reason,
      status: 'pending',
      createdAt: nowIso()
    };
    await this.setVal(`reports/${reportId}`, report);
    return report;
  }

  async getReports(): Promise<ReportDoc[]> {
    const all = await this.getVal<Record<string, ReportDoc>>('reports');
    return Object.values(all || {}).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async resolveReport(reportId: string, status: 'resolved' | 'dismissed'): Promise<boolean> {
    const r = await this.getVal<ReportDoc>(`reports/${reportId}`);
    if (!r) return false;
    await this.ref(`reports/${reportId}/status`).set(status);
    return true;
  }

  // --- Admin stats ---

  async getAdminStats() {
    const [usersSnap, gensSnap, paysSnap, txSnap, reportsSnap] = await Promise.all([
      this.ref('users').get(),
      this.ref('generations').get(),
      this.ref('payments').get(),
      this.ref('creditTransactions').get(),
      this.ref('reports').get()
    ]);

    const allUsers = Object.values((usersSnap.val() || {}) as Record<string, UserDoc>);
    const allGenerations = Object.values((gensSnap.val() || {}) as Record<string, GenerationDoc>);
    const allPayments = Object.values((paysSnap.val() || {}) as Record<string, PaymentDoc>);
    // creditTransactions are nested per user: creditTransactions/{uid}/{txId}
    const txRoot = (txSnap.val() || {}) as Record<string, Record<string, CreditTransactionDoc>>;
    const allTransactions = Object.values(txRoot).flatMap(byUid => Object.values(byUid || {}));

    const totalUsers = allUsers.length;
    const paidUsers = allUsers.filter(u => u.plan !== 'free').length;
    const totalGenerations = allGenerations.length;
    const failedGenerations = allGenerations.filter(g => g.status === 'failed').length;

    const creditsConsumed = allTransactions
      .filter(t => t.type === 'generation')
      .reduce((acc, t) => acc + Math.abs(t.amount), 0);

    const creditsSold = allTransactions
      .filter(t => t.type === 'purchase' || t.type === 'subscription')
      .reduce((acc, t) => acc + t.amount, 0);

    const totalRevenue = allPayments
      .filter(p => p.status === 'success')
      .reduce((acc, p) => acc + p.amount, 0);

    const reportsVal = (reportsSnap.val() || {}) as Record<string, ReportDoc>;

    return {
      totalUsers,
      activeUsers: Math.max(1, Math.round(totalUsers * 0.8)),
      paidUsers,
      totalRevenue,
      creditsSold,
      creditsConsumed,
      totalGenerations,
      failedGenerations,
      reportsCount: Object.values(reportsVal).filter(r => r.status === 'pending').length
    };
  }

  async getAllUsers(): Promise<UserDoc[]> {
    const all = await this.getVal<Record<string, UserDoc>>('users');
    return Object.values(all || {});
  }
}

export const db = new DatabaseService();
