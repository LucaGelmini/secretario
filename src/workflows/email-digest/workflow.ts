import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from 'cloudflare:workers';
import { summarizeEmails } from '@/operators/ai/summarize-emails';
import { fetchEmailsOperator } from '@/operators/email/fetch-emails';
import { sendTelegramMessage } from '@/operators/telegram/send-message';
import type { Env } from '@/shared/env';
import { markdownToTelegramHtml } from '@/shared/telegram-formatter';
import type { EmailDigestParams, EmailDigestResult } from './types';

/**
 * Email Digest Workflow
 *
 * This workflow orchestrates the email digest process:
 * 1. Fetch emails from Gmail
 * 2. Summarize emails with DeepSeek AI
 * 3. Send the AI summary to Telegram
 */
export class EmailDigestWorkflow extends WorkflowEntrypoint<Env, EmailDigestParams> {
  override async run(
    event: WorkflowEvent<EmailDigestParams>,
    step: WorkflowStep
  ): Promise<EmailDigestResult> {
    console.log('Email Digest Workflow started with params:', event.payload);

    // Step 1: Fetch emails from Gmail
    const emailsResult = await step.do('fetch-emails', async () => {
      return await fetchEmailsOperator.execute(
        {
          hoursBack: event.payload.hoursBack || 24,
          maxResults: 10,
          unreadOnly: false,
        },
        { env: this.env }
      );
    });

    console.log(`Fetched ${emailsResult.count} emails`);

    // Step 2: Summarize emails with AI (if we have emails)
    let digestMessage: string;

    if (emailsResult.count === 0) {
      digestMessage = '📭 No hay emails nuevos en las últimas 24 horas.';
    } else {
      const summaryResult = await step.do('summarize-emails', async () => {
        return await summarizeEmails.execute(
          {
            emails: emailsResult.emails,
            language: 'es',
            style: 'brief',
            maxTokens: 1000,
          },
          { env: this.env }
        );
      });

      console.log(
        `AI summary generated (${summaryResult.usage.totalTokens} tokens, model: ${summaryResult.model})`
      );

      // Convert Markdown to Telegram-compatible HTML
      const summaryHtml = markdownToTelegramHtml(summaryResult.summary);

      // Format final message with AI summary
      digestMessage = `<b>📧 Resumen de Emails (${emailsResult.count} emails)</b>

${summaryHtml}

<i>───</i>
<i>Tokens: ${summaryResult.usage.totalTokens} | Modelo: ${summaryResult.model}</i>`;
    }

    // Step 3: Send to Telegram
    const telegramResult = await step.do('send-to-telegram', async () => {
      return await sendTelegramMessage.execute(
        {
          text: digestMessage,
          parseMode: 'HTML', // Use HTML for formatting
          disableWebPagePreview: true,
        },
        { env: this.env }
      );
    });

    console.log(`Sent digest to Telegram (message ID: ${telegramResult.messageId})`);

    // Return workflow result
    return {
      emailCount: emailsResult.count,
      notificationSent: true,
      completedAt: new Date().toISOString(),
    };
  }
}
