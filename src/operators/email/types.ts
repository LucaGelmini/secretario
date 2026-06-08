import type { Category, ClassificationResult } from '@/config/gmail-rules';
import type { Email } from '@/integrations/gmail/types';

/**
 * Fetch Emails Operator Input/Output
 */
export interface FetchEmailsInput {
  hoursBack: number;
  maxResults?: number;
  unreadOnly?: boolean;
}

export interface FetchEmailsOutput {
  emails: Email[];
  count: number;
}

/**
 * Classify Emails Operator Input/Output
 */
export interface ClassifyEmailsInput {
  emails: Email[];
}

export interface ClassifiedEmail {
  email: Email;
  classification: ClassificationResult;
}

export interface RuleSuggestion {
  emailAddress: string;
  suggestedCategory: Category;
  suggestedLabel: string;
  sampleSubject: string;
  confidence: number;
}

export interface ClassifyEmailsOutput {
  classified: ClassifiedEmail[];
  suggestions: RuleSuggestion[];
  stats: {
    total: number;
    toLabel: number;
    toDelete: number;
    toReview: number;
    byCategory: Record<string, number>;
  };
}

/**
 * Organize Emails Operator Input/Output
 */
export interface OrganizeEmailsInput {
  classified: ClassifiedEmail[];
}

export interface OrganizeEmailsOutput {
  labeled: number;
  deleted: number;
  errors: number;
  stats: {
    byCategory: Record<string, number>;
    byAction: Record<string, number>;
  };
}
