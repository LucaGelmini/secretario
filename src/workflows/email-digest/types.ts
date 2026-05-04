/**
 * Parameters for the Email Digest Workflow
 */
export interface EmailDigestParams {
  /**
   * Optional: specific email address to fetch from (defaults to env.GOOGLE_IMPERSONATE_EMAIL)
   */
  emailAddress?: string;

  /**
   * Optional: how many hours back to look for emails (default: 24)
   */
  hoursBack?: number;

  /**
   * Optional: Telegram chat ID to send the digest to (defaults to env.TELEGRAM_CHAT_ID)
   */
  telegramChatId?: string;
}

/**
 * Result of the Email Digest Workflow
 */
export interface EmailDigestResult {
  /**
   * Number of emails processed
   */
  emailCount: number;

  /**
   * Generated summary (if AI was used)
   */
  summary?: string;

  /**
   * Whether the notification was sent successfully
   */
  notificationSent: boolean;

  /**
   * Timestamp when the workflow completed
   */
  completedAt: string;
}
