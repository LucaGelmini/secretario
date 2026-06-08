import { sendReauthLink } from '@/integrations/google/oauth-flow';
import type { Env } from '@/shared/env';
import { reportError } from '@/shared/error-reporter';
import { route } from './router';

export { EmailDigestWorkflow } from '@/workflows/email-digest/workflow';

const CRONS = {
  DAILY_DIGEST: '30 11 * * *',
  GMAIL_REAUTH: '0 12 */5 * *',
} as const;

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    try {
      return await route(request, env);
    } catch (error) {
      await reportError(env, 'fetch', error);
      return Response.json({ error: 'Internal Server Error' }, { status: 500 });
    }
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
      await reportError(env, `scheduled:${event.cron}`, error);
      throw error;
    }
  },
};
