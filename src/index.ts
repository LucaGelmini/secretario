/**
 * Secretario Worker Entrypoint
 *
 * This Worker handles:
 * - HTTP requests to manually trigger workflows
 * - Scheduled (cron) triggers for automated workflow execution
 * - Telegram webhook for bot commands (in later phases)
 */

import type { Env } from '@/shared/env';

// Export the workflow so Cloudflare can register it
export { EmailDigestWorkflow } from '@/workflows/email-digest/workflow';

/**
 * Main fetch handler for HTTP requests
 */
export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Health check endpoint
    if (url.pathname === '/' || url.pathname === '/health') {
      return Response.json({
        status: 'ok',
        service: 'secretario',
        version: '0.1.0',
        timestamp: new Date().toISOString(),
      });
    }

    // Manual workflow trigger endpoint (for testing)
    if (url.pathname === '/trigger' && request.method === 'GET') {
      try {
        // Trigger the email digest workflow
        const instance = await env.EMAIL_DIGEST_WORKFLOW.create({
          params: {
            hoursBack: 24,
          },
        });

        return Response.json({
          success: true,
          message: 'Workflow triggered successfully',
          instanceId: instance.id,
          status: await instance.status(),
        });
      } catch (error) {
        console.error('Error triggering workflow:', error);
        return Response.json(
          {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
          { status: 500 }
        );
      }
    }

    // Not found
    return Response.json(
      {
        error: 'Not found',
        availableEndpoints: ['/', '/health', '/trigger'],
      },
      { status: 404 }
    );
  },

  /**
   * Scheduled handler for cron triggers
   *
   * This will run the email digest workflow on a schedule (e.g., daily at 8am)
   */
  async scheduled(event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    console.log('Scheduled event triggered:', event.cron);

    try {
      // Trigger the email digest workflow
      const instance = await env.EMAIL_DIGEST_WORKFLOW.create({
        params: {
          hoursBack: 24,
        },
      });

      console.log('Workflow instance created:', instance.id);

      // Don't await the workflow completion - let it run in the background
      // We can monitor it via the dashboard or logs
    } catch (error) {
      console.error('Error in scheduled trigger:', error);
      // Don't throw - let the cron retry on next scheduled run
    }
  },
};
