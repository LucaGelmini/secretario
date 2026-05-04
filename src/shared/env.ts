/**
 * Cloudflare Workers Environment Bindings
 *
 * This type defines all bindings available in the Worker's execution context,
 * including Workflow bindings, secrets, and other Cloudflare resources.
 */
export interface Env {
  // Workflow Bindings
  EMAIL_DIGEST_WORKFLOW: Workflow;

  // Secrets (accessed via env in production, .dev.vars in local dev)

  // Google Service Account for Gmail API
  GOOGLE_SERVICE_ACCOUNT_EMAIL?: string;
  GOOGLE_PRIVATE_KEY?: string;
  GOOGLE_IMPERSONATE_EMAIL?: string;

  // Telegram Bot
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;

  // DeepSeek AI
  DEEPSEEK_API_KEY?: string;
}
