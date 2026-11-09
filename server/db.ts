import type { Database } from 'firebase-admin/database';
import { getRtdb } from './auth.js';

export interface UserDoc {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'user' | 'admin';
  createdAt: string;
  updatedAt: string;
  suspended?: boolean;
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
      const created: UserDoc = {
        uid,
        email,
        displayName: displayName || email.split('@')[0],
        photoURL: photoURL || `https://api.dicebear.com/7.x/shapes/svg?seed=${uid}`,
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

    // New user created — write the email index.
    const created = result.snapshot?.val() as UserDoc;
    await this.ref(`usersByEmail/${encodeEmail(email)}`).set(uid);
    return created;
  }

  async updateUser(uid: string, updates: Partial<UserDoc>): Promise<UserDoc> {
    const user = await this.getUser(uid);
    if (!user) throw new Error('User not found');
    const updated: UserDoc = { ...user, ...updates, updatedAt: nowIso() };
    await this.setVal(`users/${uid}`, updated);
    return updated;
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
    const [usersSnap, gensSnap, reportsSnap] = await Promise.all([
      this.ref('users').get(),
      this.ref('generations').get(),
      this.ref('reports').get()
    ]);

    const allUsers = Object.values((usersSnap.val() || {}) as Record<string, UserDoc>);
    const allGenerations = Object.values((gensSnap.val() || {}) as Record<string, GenerationDoc>);

    const totalUsers = allUsers.length;
    const totalGenerations = allGenerations.length;
    const failedGenerations = allGenerations.filter(g => g.status === 'failed').length;

    const reportsVal = (reportsSnap.val() || {}) as Record<string, ReportDoc>;

    return {
      totalUsers,
      activeUsers: Math.max(1, Math.round(totalUsers * 0.8)),
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
