import {
  exchangeCodeForTokens,
  getProfileEmail,
  sendReauthLink,
} from '@/integrations/google/oauth-flow';
import { saveRefreshToken } from '@/integrations/google/token-store';
import { TelegramClient } from '@/integrations/telegram/client';
import type { TelegramUpdate } from '@/integrations/telegram/types';
import { confirmRule } from '@/operators/telegram/confirm-rule';
import type { Env } from '@/shared/env';
import { htmlResponse } from '@/shared/html';
import packageJson from '../package.json';

const VERSION = packageJson.version;

export function handleHealth(): Response {
  return Response.json({
    status: 'ok',
    service: 'secretario',
    version: VERSION,
    timestamp: new Date().toISOString(),
  });
}

export async function handleTrigger(request: Request, env: Env): Promise<Response> {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!env.API_SECRET || token !== env.API_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const instance = await env.EMAIL_DIGEST_WORKFLOW.create({ params: { hoursBack: 24 } });
    return Response.json({
      success: true,
      message: 'Workflow triggered successfully',
      instanceId: instance.id,
      status: await instance.status(),
    });
  } catch (error) {
    console.error('Error triggering workflow:', error);
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function handleTelegramWebhook(request: Request, env: Env): Promise<Response> {
  try {
    const update = (await request.json()) as TelegramUpdate;
    console.log('Received Telegram update:', update);

    const chatId = update.message?.chat?.id?.toString();
    const text = update.message?.text?.trim();

    if (chatId !== env.TELEGRAM_CHAT_ID) {
      console.warn(`Unauthorized Telegram request from chat ${chatId}`);
      return new Response('OK', { status: 200 });
    }

    if (text?.startsWith('/reauth')) {
      console.log('Processing /reauth command');
      await sendReauthLink(env, env.WORKER_BASE_URL!);
      return new Response('OK', { status: 200 });
    }

    if (text?.startsWith('/digest')) {
      console.log('Processing /digest command');
      const instance = await env.EMAIL_DIGEST_WORKFLOW.create({ params: { hoursBack: 24 } });
      console.log('Workflow triggered via Telegram command:', instance.id);
      return new Response('OK', { status: 200 });
    }

    if (chatId && text) {
      await confirmRule(chatId, text, env);
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Error handling Telegram webhook:', error);
    return new Response('OK', { status: 200 });
  }
}

export async function handleOAuthCallback(url: URL, env: Env): Promise<Response> {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) return htmlResponse(`<h1>Authorization failed</h1><p>${error}</p>`, 400);
  if (!code || !state) return htmlResponse('<h1>Missing parameters</h1>', 400);

  const stateKey = `oauth:state:${state}`;
  const storedState = await env.GMAIL_RULES_KV.get(stateKey);
  if (!storedState) {
    return htmlResponse(
      '<h1>Invalid or expired link</h1><p>Please request a new one with /reauth.</p>',
      403
    );
  }
  await env.GMAIL_RULES_KV.delete(stateKey);

  try {
    const redirectUri = `${env.WORKER_BASE_URL}/oauth/callback`;
    const tokens = await exchangeCodeForTokens({
      clientId: env.GOOGLE_CLIENT_ID!,
      clientSecret: env.GOOGLE_CLIENT_SECRET!,
      code,
      redirectUri,
    });

    if (!tokens.refresh_token) {
      return htmlResponse(
        '<h1>No refresh token received</h1><p>Please remove this app at <a href="https://myaccount.google.com/permissions">myaccount.google.com/permissions</a> and try again.</p>',
        400
      );
    }

    const email = await getProfileEmail(tokens.access_token);
    if (email !== env.AUTHORIZED_GOOGLE_EMAIL) {
      console.warn(
        `OAuth identity mismatch: got ${email}, expected ${env.AUTHORIZED_GOOGLE_EMAIL}`
      );
      return htmlResponse(
        '<h1>Wrong Google account</h1><p>Please authorize with the expected account.</p>',
        403
      );
    }

    await saveRefreshToken(env, tokens.refresh_token);

    const telegram = new TelegramClient(env.TELEGRAM_BOT_TOKEN!);
    await telegram.sendMessage({
      chat_id: env.TELEGRAM_CHAT_ID!,
      text: '✅ Gmail re-authorized successfully.',
    });

    console.log('Gmail re-authorized, refresh token saved to KV');
    return htmlResponse('<h1>✅ Gmail re-authorized</h1><p>You can close this window.</p>');
  } catch (err) {
    console.error('OAuth callback error:', err);
    return htmlResponse(
      `<h1>Authorization failed</h1><p>${err instanceof Error ? err.message : 'Unknown error'}</p>`,
      500
    );
  }
}
