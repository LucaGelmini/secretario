import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from 'cloudflare:workers';
import { fetchEmailsOperator } from '@/operators/email/fetch-emails';
import type { Env } from '@/shared/env';
import type { EmailDigestParams, EmailDigestResult } from './types';

/**
 * Email Digest Workflow
 *
 * This workflow orchestrates the email digest process:
 * 1. Fetch emails from Gmail
 * 2. Summarize them using AI (TODO: Step 4)
 * 3. Send the summary to Telegram (TODO: Step 3)
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

    // Step 2: Log email subjects (for verification)
    await step.do('log-subjects', async () => {
      console.log('Email subjects:');
      for (const email of emailsResult.emails) {
        console.log(`  - [${email.date.toISOString()}] ${email.subject} (from: ${email.from})`);
      }

      return {
        subjects: emailsResult.emails.map((e) => e.subject),
      };
    });

    // Return workflow result
    return {
      emailCount: emailsResult.count,
      notificationSent: false, // TODO: Step 3 - Send to Telegram
      completedAt: new Date().toISOString(),
    };
  }
}
