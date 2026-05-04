import type { Email } from '@/integrations/gmail/types';

/**
 * Input for the fetch-emails operator
 */
export interface FetchEmailsInput {
  /**
   * How many hours back to look for emails
   */
  hoursBack: number;

  /**
   * Maximum number of emails to fetch
   */
  maxResults?: number;

  /**
   * Only fetch unread emails
   */
  unreadOnly?: boolean;
}

/**
 * Output from the fetch-emails operator
 */
export interface FetchEmailsOutput {
  /**
   * Fetched emails
   */
  emails: Email[];

  /**
   * Total number of emails fetched
   */
  count: number;
}
