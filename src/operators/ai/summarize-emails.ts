import { DeepSeekClient } from '@/integrations/deepseek/client';
import { AuthenticationError } from '@/integrations/types';
import type { Operator, OperatorContext } from '@/operators/types';
import type { SummarizeEmailsInput, SummarizeEmailsOutput } from './types';

/**
 * Operator: Summarize emails using DeepSeek AI
 *
 * Takes a list of emails and generates a concise, intelligent summary
 * highlighting the most important information.
 */
export const summarizeEmails: Operator<SummarizeEmailsInput, SummarizeEmailsOutput> = {
  name: 'summarize-emails',
  execute: async (
    input: SummarizeEmailsInput,
    context: OperatorContext
  ): Promise<SummarizeEmailsOutput> => {
  const { emails, language = 'es', style = 'brief', maxTokens = 1000 } = input;
  const { env } = context;

  // Validate env vars
  if (!env.DEEPSEEK_API_KEY) {
    throw new AuthenticationError('deepseek', 'DEEPSEEK_API_KEY is not configured');
  }

  // Create client
  const client = new DeepSeekClient(env.DEEPSEEK_API_KEY);

  // Build system prompt based on language and style
  const systemPrompts = {
    es: {
      brief: `Eres un asistente que resume emails. Genera un resumen breve y conciso en español.
Destaca solo la información más importante: quién envía, tema principal, y acciones requeridas.
Usa viñetas y sé directo. Máximo 3-4 líneas por email importante.`,
      detailed: `Eres un asistente que resume emails. Genera un resumen detallado en español.
Para cada email relevante, incluye: remitente, asunto, puntos clave, y acciones requeridas.
Organiza por prioridad o tema. Usa formato claro con viñetas.`,
    },
    en: {
      brief: `You are an email summarization assistant. Generate a brief, concise summary in English.
Highlight only the most important information: sender, main topic, and required actions.
Use bullet points and be direct. Maximum 3-4 lines per important email.`,
      detailed: `You are an email summarization assistant. Generate a detailed summary in English.
For each relevant email, include: sender, subject, key points, and required actions.
Organize by priority or topic. Use clear formatting with bullet points.`,
    },
  };

  const systemPrompt = systemPrompts[language][style];

  // Build user prompt with email data
  const emailsText = emails
    .map((email, i: number) => {
      return `Email ${i + 1}:
From: ${email.from}
Subject: ${email.subject}
Date: ${email.date.toLocaleString(language === 'es' ? 'es-ES' : 'en-US')}
Preview: ${email.snippet || '(sin vista previa)'}
`;
    })
    .join('\n---\n\n');

  const userPrompt = `Tengo ${emails.length} emails. Genera un resumen útil:

${emailsText}`;

  // Call DeepSeek API
  const response = await client.chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    {
      model: 'deepseek-chat',
      temperature: 0.7,
      maxTokens,
    }
  );

  const choice = response.choices[0];
  if (!choice) {
    throw new Error('No completion choice returned from DeepSeek');
  }

    return {
      summary: choice.message.content,
      emailCount: emails.length,
      usage: {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      },
      model: response.model,
    };
  },
};
