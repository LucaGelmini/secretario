/**
 * Operator input/output types for Telegram operations
 */

export interface SendTelegramMessageInput {
	/**
	 * Message text to send (supports Markdown or HTML if parse_mode is set)
	 */
	text: string;

	/**
	 * Optional chat ID override (if not provided, uses TELEGRAM_CHAT_ID from env)
	 */
	chatId?: string | number;

	/**
	 * Optional parse mode for formatting
	 */
	parseMode?: "Markdown" | "MarkdownV2" | "HTML";

	/**
	 * Disable web page previews
	 */
	disableWebPagePreview?: boolean;

	/**
	 * Send silently (no notification)
	 */
	silent?: boolean;
}

export interface SendTelegramMessageOutput {
	/**
	 * Telegram message ID
	 */
	messageId: number;

	/**
	 * Chat ID where the message was sent
	 */
	chatId: number;

	/**
	 * Unix timestamp when the message was sent
	 */
	sentAt: number;

	/**
	 * Whether the message was sent successfully
	 */
	success: true;
}
