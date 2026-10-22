# KANTHI AI

KANTHI AI is a full-stack AI creator platform built for Google AI Studio / Cloud Run, with Gemini generation, Firebase Authentication, server-side credits, and Razorpay payments.

## Important security notes

This repository is the hardened beta build. It intentionally does **not** contain payment secrets, seeded admin accounts, or demo-account authentication bypasses.

Before accepting real payments:

1. If a secret was ever committed or shared from an older build, revoke/rotate it in the provider dashboard.
2. Configure Firebase Authentication and the Firebase Admin service credentials.
3. Set `ADMIN_UIDS` to the Firebase Auth UID(s) that should have admin access.
4. Configure Gemini and Razorpay only through environment variables / deployment secrets.
5. Deploy with HTTPS.

## Required environment variables

Copy `.env.example` to `.env`.

### Server

- `GEMINI_API_KEY`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
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

## Payments

Razorpay order details are created server-side. During verification the server checks the Razorpay order's UID/product/type metadata before granting credits.

Webhook requests use the raw request body for signature verification.

The current plan-purchase flow is **not a recurring subscription implementation**. Treat Creator/Pro purchases as manually renewable until Razorpay Subscriptions are explicitly implemented.

## Current product modules

- Firebase authentication
- AI image generation
- Prompt enhancement
- Credit accounting
- History
- Favorites
- Projects
- Explore/community
- AI video/audio modules where their configured provider APIs are available
- Razorpay credit purchases
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
