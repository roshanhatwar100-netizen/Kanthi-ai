# KANTHI AI

KANTHI AI is a full-stack AI creator platform built for Google AI Studio / Cloud Run, with Gemini generation and Firebase Authentication. Generation is free — no payments or credits.

## Important security notes

This repository is the hardened beta build. It intentionally does **not** contain seeded admin accounts or demo-account authentication bypasses.

Before going live:

1. If a secret was ever committed or shared from an older build, revoke/rotate it in the provider dashboard.
2. Configure Firebase Authentication and the Firebase Admin service credentials.
3. Set `ADMIN_UIDS` to the Firebase Auth UID(s) that should have admin access.
4. Configure Gemini only through environment variables / deployment secrets.
5. Deploy with HTTPS.

## Required environment variables

Copy `.env.example` to `.env`.

### Server

- `GEMINI_API_KEY`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `ADMIN_UIDS`
- `PORT` (default `3000`)

### Frontend Firebase

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

## Local development

```bash
npm install
npm run dev
```

The full-stack development server runs on port 3000 by default and attaches Vite middleware automatically.

## Production build

```bash
npm run build
NODE_ENV=production npm start
```

## Authentication architecture

The browser authenticates with Firebase and sends a Firebase ID token as a Bearer token to private API routes. The server verifies that token with Firebase Admin SDK.

The server no longer trusts a client-supplied `x-user-id` header.

## Current product modules

- Firebase authentication
- AI image generation
- Prompt enhancement
- History
- Favorites
- Projects
- Explore/community
- AI video/audio modules where their configured provider APIs are available
- Admin dashboard

## Before launch

Also add:

- Firestore/managed database instead of the local JSON database for multi-instance production
- object storage for generated media instead of large data URLs
- rate limiting and abuse controls at the edge/API layer
- background job queue for long video generations
- real recurring subscription lifecycle/webhooks
- privacy policy, terms, refund policy, moderation policy and applicable tax/business setup
- monitoring and backups
