import type { Env } from '@/shared/env';
import {
  handleHealth,
  handleOAuthCallback,
  handleTelegramWebhook,
  handleTrigger,
} from './handlers';

const AVAILABLE_ENDPOINTS = ['/', '/health', '/trigger', '/telegram/webhook', '/oauth/callback'];

export async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === '/' || url.pathname === '/health') return handleHealth();

  if (url.pathname === '/trigger' && request.method === 'GET') return handleTrigger(request, env);

  if (url.pathname === '/telegram/webhook' && request.method === 'POST')
    return handleTelegramWebhook(request, env);

  if (url.pathname === '/oauth/callback' && request.method === 'GET')
    return handleOAuthCallback(url, env);

  return Response.json(
    { error: 'Not found', availableEndpoints: AVAILABLE_ENDPOINTS },
    { status: 404 }
  );
}
