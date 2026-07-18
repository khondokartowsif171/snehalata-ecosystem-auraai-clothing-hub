import { redirect, error } from '@sveltejs/kit';
import { oauthUrl, fbConfigured } from '$lib/server/fbConnect.server';
import crypto from 'crypto';
import type { RequestHandler } from './$types';

// Kick off Facebook Login. A CSRF `state` is stored in a short-lived cookie and echoed by Meta.
export const GET: RequestHandler = async ({ cookies }) => {
  if (!fbConfigured()) throw error(503, 'Facebook connect is not configured yet.');
  const state = crypto.randomBytes(16).toString('hex');
  cookies.set('fb_state', state, {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600
  });
  throw redirect(302, oauthUrl(state));
};
