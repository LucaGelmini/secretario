import { TelegramClient } from '@/integrations/telegram/client';
import type { Env } from './env';

export async function reportError(env: Env, context: string, error: unknown): Promise<void> {
  const name = error instanceof Error ? error.name : 'Error';
  const message = error instanceof Error ? error.message : String(error);

  console.error(`[${context}] ${name}: ${message}`);

  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return;

  const text = `🚨 secretario error\n\nContext: ${context}\n${name}: ${message}`.slice(0, 4096);

  try {
    const client = new TelegramClient(env.TELEGRAM_BOT_TOKEN);
    await client.sendMessage({ chat_id: env.TELEGRAM_CHAT_ID, text });
  } catch (sendError) {
    console.error(
      'Failed to report error to Telegram:',
      sendError instanceof Error ? sendError.message : String(sendError)
    );
  }
}
