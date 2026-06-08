import { sendReauthLink } from '@/integrations/google/oauth-flow';
import type { Env } from '@/shared/env';
import { route } from './router';

export { EmailDigestWorkflow } from '@/workflows/email-digest/workflow';

const CRONS = {
  DAILY_DIGEST: '30 11 * * *',
  GMAIL_REAUTH: '0 12 */5 * *',
} as const;

export default {
  fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    return route(request, env);
  },

  async scheduled(event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    console.log('Scheduled event triggered:', event.cron);
    try {
      if (event.cron === CRONS.GMAIL_REAUTH) {
        await sendReauthLink(env, env.WORKER_BASE_URL!);
        console.log('Re-auth link sent via Telegram');
      } else {
        const instance = await env.EMAIL_DIGEST_WORKFLOW.create({ params: { hoursBack: 24 } });
        console.log('Workflow instance created:', instance.id);
      }
    } catch (error) {
      console.error('Error in scheduled trigger:', error);
    }
  },
};
