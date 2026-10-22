import { auth } from './firebase';

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  const currentUser = auth.currentUser;
  if (currentUser) {
    const token = await currentUser.getIdToken();
    headers.set('Authorization', `Bearer ${token}`);
  }
  // Do not accept client-controlled identity headers in production.
  headers.delete('x-user-id');
  return fetch(input, { ...init, headers });
}
