/**
 * Secretario Worker Entrypoint
 *
 * This Worker handles:
 * - HTTP requests to manually trigger workflows
 * - Scheduled (cron) triggers for automated workflow execution
 * - Telegram webhook for bot commands
 */

import type { TelegramUpdate } from '@/integrations/telegram/types';
import type { Env } from '@/shared/env';
import packageJson from '../package.json';

// Export the workflow so Cloudflare can register it
export { EmailDigestWorkflow } from '@/workflows/email-digest/workflow';

const VERSION = packageJson.version;

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
        version: VERSION,
        timestamp: new Date().toISOString(),
      });
    }

    // Manual workflow trigger endpoint
    if (url.pathname === '/trigger' && request.method === 'GET') {
      // Authenticate with Bearer token
      const authHeader = request.headers.get('Authorization');
      const token = authHeader?.replace('Bearer ', '');

      if (!env.API_SECRET || token !== env.API_SECRET) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }

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

    // Telegram webhook endpoint
    if (url.pathname === '/telegram/webhook' && request.method === 'POST') {
      try {
        const update = (await request.json()) as TelegramUpdate;
        console.log('Received Telegram update:', update);

        const chatId = update.message?.chat?.id?.toString();
        const text = update.message?.text?.trim();

        // Security: Only respond to authorized chat
        if (chatId !== env.TELEGRAM_CHAT_ID) {
          console.warn(`Unauthorized Telegram request from chat ${chatId}`);
          return new Response('OK', { status: 200 }); // Silent reject
        }

        // Handle /digest command
        if (text?.startsWith('/digest')) {
          console.log('Processing /digest command');

          // Trigger the email digest workflow
          const instance = await env.EMAIL_DIGEST_WORKFLOW.create({
            params: {
              hoursBack: 24,
            },
          });

          console.log('Workflow triggered via Telegram command:', instance.id);
          return new Response('OK', { status: 200 });
        }

        // Handle rule confirmation (e.g., "1" or "1 facturas")
        const ruleMatch = text?.match(/^(\d+)\s*(.*)$/);
        if (ruleMatch) {
          const [, indexStr, overrideCategory] = ruleMatch;
          const index = indexStr || '';

          console.log(`Processing rule confirmation: index=${index}, override=${overrideCategory}`);

          // Load pending suggestions from KV
          const pendingJson = await env.GMAIL_RULES_KV.get('rules:pending');
          if (!pendingJson) {
            console.log('No pending rules found');
            return new Response('OK', { status: 200 });
          }

          const pending = JSON.parse(pendingJson);
          const suggestion = pending[index];

          if (!suggestion) {
            console.log(`Invalid rule index: ${index}`);
            return new Response('OK', { status: 200 });
          }

          // Determine final category (use override if provided)
          let finalCategory = suggestion.suggestedCategory;
          let finalLabel = suggestion.suggestedLabel;

          if (overrideCategory) {
            // User wants to change category
            finalLabel = overrideCategory.trim();
            finalCategory = overrideCategory
              .toLowerCase()
              .replace(/\s+/g, '_')
              .replace(/[áàäâ]/g, 'a')
              .replace(/[éèëê]/g, 'e')
              .replace(/[íìïî]/g, 'i')
              .replace(/[óòöô]/g, 'o')
              .replace(/[úùüû]/g, 'u');
          }

          // Save to learned rules
          const learnedJson = await env.GMAIL_RULES_KV.get('rules:learned');
          const learned = learnedJson ? JSON.parse(learnedJson) : {};

          learned[suggestion.email] = {
            category: finalCategory,
            labelName: finalLabel,
            confirmedAt: new Date().toISOString(),
            source: 'ai_suggestion',
          };

          await env.GMAIL_RULES_KV.put('rules:learned', JSON.stringify(learned));

          // Remove from pending
          delete pending[index];
          await env.GMAIL_RULES_KV.put('rules:pending', JSON.stringify(pending), {
            expirationTtl: 7 * 24 * 60 * 60,
          });

          // Send confirmation via TelegramClient
          const { TelegramClient } = await import('@/integrations/telegram/client');
          const telegram = new TelegramClient(env.TELEGRAM_BOT_TOKEN!);

          await telegram.sendMessage({
            chat_id: chatId!,
            text: `✅ Regla guardada:\n<code>${suggestion.email}</code> → <b>${finalLabel}</b>`,
            parse_mode: 'HTML',
          });

          console.log(`Rule confirmed: ${suggestion.email} → ${finalCategory}`);
          return new Response('OK', { status: 200 });
        }

        // Ignore other messages
        return new Response('OK', { status: 200 });
      } catch (error) {
        console.error('Error handling Telegram webhook:', error);
        // Always return 200 to Telegram to avoid retries
        return new Response('OK', { status: 200 });
      }
    }

    // Not found
    return Response.json(
      {
        error: 'Not found',
        availableEndpoints: ['/', '/health', '/trigger', '/telegram/webhook'],
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
