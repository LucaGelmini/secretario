/**
 * Operator input/output types for AI operations
 */

import type { Email } from '@/integrations/gmail/types';

export interface SummarizeEmailsInput {
  /**
   * Emails to summarize
   */
  emails: Email[];

  /**
   * Language for the summary (default: 'es' for Spanish)
   */
  language?: 'en' | 'es';

  /**
   * Summary style
   */
  style?: 'brief' | 'detailed';

  /**
   * Maximum summary length in tokens (approximate)
   */
  maxTokens?: number;
}

export interface SummarizeEmailsOutput {
  /**
   * Generated summary text
   */
  summary: string;

  /**
   * Number of emails summarized
   */
  emailCount: number;

  /**
   * Token usage statistics
   */
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };

  /**
   * Model used for summarization
   */
  model: string;
}
