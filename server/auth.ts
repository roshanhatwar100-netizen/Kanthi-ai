import type { Request, Response, NextFunction } from 'express';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import type { App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';
import { getStorage } from 'firebase-admin/storage';
import { SERVER_CONFIG } from './config.js';

const RTDB_URL =
  process.env.FIREBASE_DATABASE_URL ||
  'https://kanthi-ai-default-rtdb.asia-southeast1.firebasedatabase.app/';

let app: App | null = null;

// Single shared Admin SDK app for both Auth and Realtime Database.
function getApp(): App | null {
  if (app) return app;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) return null;
  const existing = getApps();
  app = existing.length
    ? existing[0]
    : initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
        databaseURL: RTDB_URL,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`
      });
  return app;
}

export function getAdminAuth(): ReturnType<typeof getAuth> | null {
  const a = getApp();
  if (!a) return null;
  return getAuth(a);
}

export function getRtdb(): ReturnType<typeof getDatabase> | null {
  const a = getApp();
  if (!a) return null;
  return getDatabase(a);
}

export function getStorageBucket() {
  const a = getApp();
  if (!a) return null;
  try {
    return getStorage(a).bucket();
  } catch {
    return null;
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Authentication required.' });
  const auth = getAdminAuth();
  if (!auth) return res.status(503).json({ error: 'Server authentication is not configured.' });
  try {
    const decoded = await auth.verifyIdToken(token);
    (req as any).auth = decoded; res.locals.auth = decoded;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
}

export function getAuthenticatedUserId(req: Request): string {
  return String((req as any).auth?.uid || '');
}


export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const uid = getAuthenticatedUserId(req);
  const email = String((res.locals.auth as any)?.email || '').toLowerCase();
  const configured = SERVER_CONFIG.adminUids.includes(uid);
  if (!configured) return res.status(403).json({ error: 'Administrator privileges required.' });
  res.locals.authEmail = email;
  next();
}
