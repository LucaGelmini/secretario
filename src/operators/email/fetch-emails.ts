import { GmailClient } from '@/integrations/gmail/client';
import { getGmailAccessToken } from '@/integrations/google/token-store';
import type { Operator, OperatorContext } from '@/operators/types';
import type { FetchEmailsInput, FetchEmailsOutput } from './types';

/**
 * Fetch emails operator
 *
 * This operator:
 * 1. Authenticates with Google using OAuth2 refresh token (KV-first, env fallback)
 * 2. Fetches emails from Gmail using the Gmail API
 * 3. Returns the emails with their subjects, senders, and snippets
 */
export const fetchEmailsOperator: Operator<FetchEmailsInput, FetchEmailsOutput> = {
  name: 'fetch-emails',

  async execute(input, ctx: OperatorContext): Promise<FetchEmailsOutput> {
    console.log('Getting Google access token from refresh token...');
    const accessToken = await getGmailAccessToken(ctx.env);

    const gmail = new GmailClient({
      accessToken,
      userId: 'me',
    });

    const after = new Date();
    after.setHours(after.getHours() - input.hoursBack);

    console.log(`Fetching emails from the last ${input.hoursBack} hours...`);
    const emails = await gmail.fetchEmails({
      after,
      maxResults: input.maxResults || 10,
      unreadOnly: input.unreadOnly,
    });

    console.log(`Fetched ${emails.length} emails`);

    return {
      emails,
      count: emails.length,
    };
  },
};
