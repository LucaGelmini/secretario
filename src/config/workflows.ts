/**
 * Declarative Workflow Configuration
 *
 * This file serves as the single source of truth for all workflow configurations.
 * It defines cron schedules, default parameters, and descriptions.
 *
 * Note: The cron schedule must also be duplicated in wrangler.jsonc under `triggers.crons`
 * because Cloudflare reads it at deploy time. This config file is for runtime params
 * and documentation.
 */

export const WORKFLOWS = {
  /**
   * Email Digest Workflow
   *
   * Runs daily at 8:30 AM Argentina time (UTC-3 = 11:30 UTC)
   *
   * This workflow:
   * 1. Fetches new emails from the last 24 hours
   * 2. Classifies emails using deterministic rules + AI fallback
   * 3. Organizes emails (labels, delete, archive)
   * 4. Generates AI summary of important emails
   * 5. Sends digest to Telegram with classification stats and rule suggestions
   */
  emailDigest: {
    name: 'email-digest',
    cron: '30 11 * * *', // 11:30 UTC = 08:30 UTC-3 (Argentina)
    description: 'Daily email digest with automatic classification and cleanup',
    defaultParams: {
      hoursBack: 24,
      maxResults: 50,
      language: 'es' as const,
      style: 'brief' as const,
    },
  },
} as const;

/**
 * Helper to get workflow config
 */
export function getWorkflowConfig(name: keyof typeof WORKFLOWS) {
  return WORKFLOWS[name];
}

/**
 * Type for workflow configuration
 */
export type WorkflowConfig = (typeof WORKFLOWS)[keyof typeof WORKFLOWS];

/**
 * Type for email digest params
 */
export type EmailDigestParams = (typeof WORKFLOWS)['emailDigest']['defaultParams'];
