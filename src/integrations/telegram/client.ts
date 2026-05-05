import { IntegrationError } from '@/integrations/types';
import type {
  TelegramApiResponse,
  TelegramMessage,
  TelegramSendMessageParams,
  TelegramSetWebhookParams,
  TelegramWebhookInfo,
} from './types';

/**
 * Telegram Bot API client
 */
export class TelegramClient {
  private readonly baseUrl: string;

  constructor(readonly botToken: string) {
    this.baseUrl = `https://api.telegram.org/bot${botToken}`;
  }

  /**
   * Send a message to a chat
   */
  async sendMessage(params: TelegramSendMessageParams): Promise<TelegramMessage> {
    const response = await this.apiRequest<TelegramMessage>('sendMessage', params);
    return response;
  }

  /**
   * Set webhook URL for receiving updates
   */
  async setWebhook(params: TelegramSetWebhookParams): Promise<boolean> {
    const response = await this.apiRequest<boolean>('setWebhook', params);
    return response;
  }

  /**
   * Get current webhook info
   */
  async getWebhookInfo(): Promise<TelegramWebhookInfo> {
    const response = await this.apiRequest<TelegramWebhookInfo>('getWebhookInfo', {});
    return response;
  }

  /**
   * Delete webhook (switch back to getUpdates)
   */
  async deleteWebhook(): Promise<boolean> {
    const response = await this.apiRequest<boolean>('deleteWebhook', {});
    return response;
  }

	/**
	 * Generic API request method
	 */
	private async apiRequest<T>(method: string, params: Record<string, unknown> | object): Promise<T> {
    const url = `${this.baseUrl}/${method}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      const data = (await response.json()) as TelegramApiResponse<T>;

      if (!data.ok || !data.result) {
        console.error('Telegram API error:', data.description);
        throw new IntegrationError(
          'telegram',
          `Telegram API error: ${data.description || 'Unknown error'}`,
          data.error_code
        );
      }

      return data.result;
    } catch (error) {
      if (error instanceof IntegrationError) {
        throw error;
      }

      throw new IntegrationError(
        'telegram',
        `Failed to call Telegram API: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
