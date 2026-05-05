import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from 'cloudflare:workers';
import { fetchEmailsOperator } from '@/operators/email/fetch-emails';
import { sendTelegramMessage } from '@/operators/telegram/send-message';
import type { Env } from '@/shared/env';
import type { EmailDigestParams, EmailDigestResult } from './types';

/**
 * Email Digest Workflow
 *
 * This workflow orchestrates the email digest process:
 * 1. Fetch emails from Gmail
 * 2. Format email digest message
 * 3. Send the digest to Telegram
 * 4. (TODO: Step 4) Summarize with DeepSeek AI
 */
export class EmailDigestWorkflow extends WorkflowEntrypoint<Env, EmailDigestParams> {
  async run(
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

    // Step 2: Format email digest message
    const digestMessage = await step.do('format-digest', async () => {
      if (emailsResult.count === 0) {
        return 'No new emails in the last 24 hours.';
      }

      const lines = [
        `📧 Email Digest (${emailsResult.count} emails)\n`,
        ...emailsResult.emails.map((email, i) => {
          const date = new Date(email.date).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
          return `${i + 1}. ${email.subject}\n   From: ${email.from}\n   ${date}`;
        }),
      ];

      return lines.join('\n');
    });

    console.log('Digest message formatted');

    // Step 3: Send to Telegram
    const telegramResult = await step.do('send-to-telegram', async () => {
      return await sendTelegramMessage(
        {
          text: digestMessage,
          parseMode: undefined, // Plain text for now
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
