// Vercel serverless function entry for the KANTHI AI backend.
// Forwards all /api/* requests to the Express app compiled from server/index.ts.
// NOTE: server/index.ts must export `app` and must NOT auto-start a listener
// when imported (guarded there by the VERCEL env check + isMainEntry check).
// This file is compiled by Vercel's own build step (it is NOT part of the
// local `tsc -p tsconfig.server.json` build), so it imports the compiled
// dist-server output produced by `npm run build`.
import type { Request, Response } from 'express';
// @ts-ignore — dist-server has no .d.ts; it exists after `npm run build` (Vercel builds functions with esbuild, no type-check)
import { app } from '../dist-server/index.js';

// Disable Vercel's built-in body parser. The Express app registers its own
// express.json() middleware with a `verify` hook that captures the raw
// request body — required for Razorpay webhook signature verification.
// If Vercel pre-parsed the body, the raw stream would already be consumed.
export const config = {
  api: { bodyParser: false },
};

export default function handler(req: Request, res: Response) {
  app(req, res);
}
