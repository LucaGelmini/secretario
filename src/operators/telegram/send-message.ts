import { TelegramClient } from '@/integrations/telegram/client';
import { AuthenticationError } from '@/integrations/types';
import type { Operator, OperatorContext } from '@/operators/types';
import type { SendTelegramMessageInput, SendTelegramMessageOutput } from './types';

/**
 * Operator: Send a message to Telegram
 *
 * Sends a text message to a specified chat (or default chat from env).
 * Supports Markdown/HTML formatting.
 */
export const sendTelegramMessage: Operator<SendTelegramMessageInput, SendTelegramMessageOutput> = {
  name: 'send-telegram-message',
  execute: async (
    input: SendTelegramMessageInput,
    context: OperatorContext
  ): Promise<SendTelegramMessageOutput> => {
    const { text, chatId, parseMode, disableWebPagePreview, silent } = input;
    const { env } = context;

    // Validate env vars
    if (!env.TELEGRAM_BOT_TOKEN) {
      throw new AuthenticationError('telegram', 'TELEGRAM_BOT_TOKEN is not configured');
    }

    // Use provided chatId or fall back to env default
    const targetChatId = chatId ?? env.TELEGRAM_CHAT_ID;
    if (!targetChatId) {
      throw new AuthenticationError(
        'telegram',
        'No chat ID provided and TELEGRAM_CHAT_ID is not configured'
      );
    }

    // Create client and send message
    const client = new TelegramClient(env.TELEGRAM_BOT_TOKEN);

    const message = await client.sendMessage({
      chat_id: targetChatId,
      text,
      parse_mode: parseMode,
      disable_web_page_preview: disableWebPagePreview,
      disable_notification: silent,
    });

    return {
      messageId: message.message_id,
      chatId: message.chat.id,
      sentAt: message.date,
      success: true,
    };
  },
};
