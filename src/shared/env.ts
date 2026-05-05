/**
 * Cloudflare Workers Environment Bindings
 *
 * This type defines all bindings available in the Worker's execution context,
 * including Workflow bindings, secrets, and other Cloudflare resources.
 */
export interface Env {
  // Workflow Bindings
  EMAIL_DIGEST_WORKFLOW: Workflow;

  // KV Namespaces
  GMAIL_RULES_KV: KVNamespace;

  // Secrets (accessed via env in production, .dev.vars in local dev)

  // Google OAuth2 for Gmail API (personal accounts)
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REFRESH_TOKEN?: string;

  // Telegram Bot
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;

  // DeepSeek AI
  DEEPSEEK_API_KEY?: string;
}
