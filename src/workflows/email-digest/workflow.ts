import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from 'cloudflare:workers';
import { summarizeEmails } from '@/operators/ai/summarize-emails';
import {
  classifyEmailsOperator,
  fetchEmailsOperator,
  organizeEmailsOperator,
} from '@/operators/email';
import { sendTelegramMessage } from '@/operators/telegram/send-message';
import type { Env } from '@/shared/env';
import { reportError } from '@/shared/error-reporter';
import { markdownToTelegramHtml } from '@/shared/telegram-formatter';
import type { EmailDigestParams, EmailDigestResult } from './types';

/**
 * Email Digest Workflow
 *
 * This workflow orchestrates the email digest process:
 * 1. Fetch emails from Gmail
 * 2. Classify emails (deterministic rules + learned rules + AI fallback)
 * 3. Organize emails (apply labels, delete, archive)
 * 4. Summarize important emails with DeepSeek AI
 * 5. Send digest to Telegram with stats and rule suggestions
 */
export class EmailDigestWorkflow extends WorkflowEntrypoint<Env, EmailDigestParams> {
  override async run(
    event: WorkflowEvent<EmailDigestParams>,
    step: WorkflowStep
  ): Promise<EmailDigestResult> {
    try {
      return await this.runDigest(event, step);
    } catch (error) {
      await reportError(this.env, 'email-digest-workflow', error);
      throw error;
    }
  }

  private async runDigest(
    event: WorkflowEvent<EmailDigestParams>,
    step: WorkflowStep
  ): Promise<EmailDigestResult> {
    console.log('Email Digest Workflow started with params:', event.payload);

    // Step 1: Fetch emails from Gmail
    const emailsResult = await step.do('fetch-emails', async () => {
      return await fetchEmailsOperator.execute(
        {
          hoursBack: event.payload.hoursBack || 24,
          maxResults: 50, // Increased from 10
          unreadOnly: false,
        },
        { env: this.env }
      );
    });

    console.log(`Fetched ${emailsResult.count} emails`);

    if (emailsResult.count === 0) {
      // No emails - send simple message
      await step.do('send-empty-digest', async () => {
        return await sendTelegramMessage.execute(
          {
            text: '📭 No hay emails nuevos en las últimas 24 horas.',
            parseMode: 'HTML',
          },
          { env: this.env }
        );
      });

      return {
        emailCount: 0,
        notificationSent: true,
        completedAt: new Date().toISOString(),
      };
    }

    // Step 2: Classify emails
    const classifyResult = await step.do('classify-emails', async () => {
      return await classifyEmailsOperator.execute(
        {
          emails: emailsResult.emails,
        },
        { env: this.env }
      );
    });

    console.log(`Classified ${classifyResult.classified.length} emails`);
    console.log('Classification stats:', classifyResult.stats);

    // Step 3: Organize emails (apply labels, delete)
    const organizeResult = await step.do('organize-emails', async () => {
      return await organizeEmailsOperator.execute(
        {
          classified: classifyResult.classified,
        },
        { env: this.env }
      );
    });

    console.log(`Organized: ${organizeResult.labeled} labeled, ${organizeResult.deleted} deleted`);

    // Step 4: Summarize important emails (only those to keep)
    const importantEmails = classifyResult.classified
      .filter((c) => c.classification.action === 'label')
      .map((c) => c.email);

    let summaryHtml = '';
    let tokensUsed = 0;

    if (importantEmails.length > 0) {
      const summaryResult = await step.do('summarize-emails', async () => {
        return await summarizeEmails.execute(
          {
            emails: importantEmails,
            language: 'es',
            style: 'brief',
            maxTokens: 1000,
          },
          { env: this.env }
        );
      });

      summaryHtml = markdownToTelegramHtml(summaryResult.summary);
      tokensUsed = summaryResult.usage.totalTokens;
      console.log(`AI summary generated (${tokensUsed} tokens)`);
    }

    // Step 5: Format and send digest to Telegram
    const digestMessage = `<b>📧 Resumen de Emails (${emailsResult.count} emails)</b>

${summaryHtml || '<i>No hay emails importantes para resumir.</i>'}

📊 <b>Organización automática:</b>
  🏷️ Etiquetados: ${organizeResult.labeled}
  🗑️ Eliminados: ${organizeResult.deleted}
  ❓ Sin categorizar: ${classifyResult.stats.toReview}

<i>───</i>
<i>Tokens: ${tokensUsed} | Modelo: deepseek-chat</i>`;

    await step.do('send-digest', async () => {
      return await sendTelegramMessage.execute(
        {
          text: digestMessage,
          parseMode: 'HTML',
          disableWebPagePreview: true,
        },
        { env: this.env }
      );
    });

    // Step 6: Send rule suggestions (if any) in a separate message
    if (classifyResult.suggestions.length > 0) {
      await step.do('send-suggestions', async () => {
        const suggestionsText = classifyResult.suggestions
          .map((s, i) => {
            return `${i + 1}. <code>${s.emailAddress}</code> → <b>${s.suggestedLabel}</b>
   "${s.sampleSubject}"`;
          })
          .join('\n\n');

        const suggestionMessage = `🆕 <b>Nuevos remitentes detectados:</b>

${suggestionsText}

Respondé con el número para aprobar.
Ej: "1" aprueba, "1 facturas" cambia categoría.
<i>Expiran en 7 días.</i>`;

        // Save suggestions to KV as pending
        const pending: Record<string, any> = {};
        for (let i = 0; i < classifyResult.suggestions.length; i++) {
          const s = classifyResult.suggestions[i];
          if (!s) continue;
          pending[(i + 1).toString()] = {
            email: s.emailAddress,
            suggestedCategory: s.suggestedCategory,
            suggestedLabel: s.suggestedLabel,
            sampleSubject: s.sampleSubject,
            confidence: s.confidence,
            createdAt: new Date().toISOString(),
          };
        }

        await this.env.GMAIL_RULES_KV.put('rules:pending', JSON.stringify(pending), {
          expirationTtl: 7 * 24 * 60 * 60, // 7 days
        });

        return await sendTelegramMessage.execute(
          {
            text: suggestionMessage,
            parseMode: 'HTML',
          },
          { env: this.env }
        );
      });
    }

    console.log('Digest sent successfully');

    return {
      emailCount: emailsResult.count,
      notificationSent: true,
      completedAt: new Date().toISOString(),
    };
  }
}
