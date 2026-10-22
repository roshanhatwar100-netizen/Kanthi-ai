import { apiFetch } from '../api';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  isFirebaseConfigured
} from '../firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signupWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshCredits: () => Promise<void>;
  updateLocalCredits: (newCredits: number) => void;
  switchDemoUser: (role: 'admin' | 'creator' | 'user') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'kanthi_auth_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Sync with backend API
  const syncUserWithBackend = async (
    uid: string,
    email: string,
    displayName?: string,
    photoURL?: string
  ): Promise<User> => {
    const res = await apiFetch('/api/user/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, email, displayName, photoURL })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to sync user with server');
    }
    const data = await res.json();
    setUser(data.user);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data.user));
    return data.user;
  };

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      try {
        if (!fbUser) {
          setUser(null);
          localStorage.removeItem(LOCAL_STORAGE_KEY);
          return;
        }
        await syncUserWithBackend(
          fbUser.uid,
          fbUser.email || '',
          fbUser.displayName || undefined,
          fbUser.photoURL || undefined
        );
      } catch (err) {
        console.error('Authentication sync failed:', err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const loginWithGoogle = async () => {
    if (isFirebaseConfigured) {
      try {
        // Timeout guard: if the popup hangs (blocked/closed without resolving),
        // reject after 60s instead of leaving the UI permanently disabled.
        const result = await Promise.race([
          signInWithPopup(auth, googleProvider),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Google sign-in timed out. Please try again.')), 60000)
          ),
        ]);
        const fbUser = result.user;
        await syncUserWithBackend(
          fbUser.uid,
          fbUser.email || 'user@kanthi.ai',
          fbUser.displayName || undefined,
          fbUser.photoURL || undefined
        );
        return;
      } catch (err: any) {
        // User closing the popup is not an error worth surfacing.
        if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
          throw new Error('Google sign-in was cancelled.');
        }
        // Surface the real Firebase error — never swallow it behind a
        // misleading "not configured" message.
        if (err?.code === 'auth/unauthorized-domain') {
          throw new Error('Google sign-in is not enabled for this site yet (unauthorized domain).');
        }
        if (err?.code === 'auth/popup-blocked') {
          throw new Error('The sign-in popup was blocked. Please allow popups for this site and try again.');
        }
        if (err?.code === 'auth/operation-not-allowed') {
          throw new Error('Google sign-in is not enabled in the Firebase console.');
        }
        throw new Error(err?.message || 'Google sign-in failed. Please try again.');
      }
    }
    throw new Error('Firebase Authentication is not configured. Add VITE_FIREBASE_* environment variables.');
  };

  const loginWithEmail = async (email: string, pass: string) => {
    if (isFirebaseConfigured) {
      try {
        const res = await signInWithEmailAndPassword(auth, email, pass);
        await syncUserWithBackend(res.user.uid, res.user.email || email, res.user.displayName || undefined);
        return;
      } catch (err: any) {
        // Surface the real Firebase error instead of a misleading message.
        throw new Error(err?.message || 'Authentication failed. Please try again.');
      }
    }
    throw new Error('Firebase Authentication is not configured. Add VITE_FIREBASE_* environment variables.');
  };

  const signupWithEmail = async (email: string, pass: string, name: string) => {
    if (isFirebaseConfigured) {
      try {
        const res = await createUserWithEmailAndPassword(auth, email, pass);
        await syncUserWithBackend(res.user.uid, res.user.email || email, name);
        return;
      } catch (err: any) {
        // Surface the real Firebase error instead of a misleading message.
        throw new Error(err?.message || 'Account creation failed. Please try again.');
      }
    }
    throw new Error('Firebase Authentication is not configured. Add VITE_FIREBASE_* environment variables.');
  };

  const logout = async () => {
    try {
      if (isFirebaseConfigured) {
        await signOut(auth);
      }
    } catch (e) {}
    setUser(null);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  };

  const refreshCredits = async () => {
    if (!user) return;
    try {
      const res = await apiFetch('/api/user/credits', {
        headers: {}
      });
      const data = await res.json();
      if (data.credits !== undefined) {
        setUser(prev => prev ? { ...prev, credits: data.credits, plan: data.plan, role: data.role } : null);
      }
    } catch (err) {
      console.error('Failed to refresh credits:', err);
    }
  };

  const updateLocalCredits = (newCredits: number) => {
    setUser(prev => prev ? { ...prev, credits: newCredits } : null);
  };

  const switchDemoUser = async (_role: 'admin' | 'creator' | 'user') => {
    throw new Error('Demo accounts are disabled in production.');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginWithGoogle,
        loginWithEmail,
        signupWithEmail,
        logout,
        refreshCredits,
        updateLocalCredits,
        switchDemoUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
