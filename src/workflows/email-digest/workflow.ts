import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from 'cloudflare:workers';
import type { Env } from '@/shared/env';
import type { EmailDigestParams, EmailDigestResult } from './types';

/**
 * Email Digest Workflow
 *
 * This workflow orchestrates the email digest process:
 * 1. Fetch emails from Gmail
 * 2. Summarize them using AI
 * 3. Send the summary to Telegram
 *
 * For now, this is a dummy implementation that just logs "Hello from Secretario"
 */
export class EmailDigestWorkflow extends WorkflowEntrypoint<Env, EmailDigestParams> {
  async run(
    event: WorkflowEvent<EmailDigestParams>,
    step: WorkflowStep
  ): Promise<EmailDigestResult> {
    // Step 1: Initialize (dummy for now)
    const initResult = await step.do('initialize', async () => {
      console.log('Workflow triggered with params:', event.payload);
      return {
        message: 'Hello from Secretario! 🤖',
        timestamp: new Date().toISOString(),
        params: event.payload,
      };
    });

    console.log('Init result:', initResult);

    // Step 2: Dummy processing
    const processResult = await step.do('process', async () => {
      // Simulate some work
      await new Promise((resolve) => setTimeout(resolve, 100));

      return {
        emailCount: 0, // No emails yet (dummy)
        processed: true,
      };
    });

    console.log('Process result:', processResult);

    // Return workflow result
    return {
      emailCount: processResult.emailCount,
      notificationSent: false, // No notification yet (dummy)
      completedAt: new Date().toISOString(),
    };
  }
}
