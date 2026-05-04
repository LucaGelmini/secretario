import { GmailClient } from '@/integrations/gmail/client';
import { getGoogleAccessToken } from '@/integrations/google/auth';
import type { GoogleServiceAccountCredentials } from '@/integrations/google/types';
import type { Operator, OperatorContext } from '@/operators/types';
import { validateEnv } from '@/shared/errors';
import type { FetchEmailsInput, FetchEmailsOutput } from './types';

/**
 * Gmail API scope for reading emails
 */
const GMAIL_READONLY_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';

/**
 * Fetch emails operator
 *
 * This operator:
 * 1. Authenticates with Google using a service account
 * 2. Fetches emails from Gmail using the Gmail API
 * 3. Returns the emails with their subjects, senders, and snippets
 */
export const fetchEmailsOperator: Operator<FetchEmailsInput, FetchEmailsOutput> = {
  name: 'fetch-emails',

  async execute(input, ctx: OperatorContext): Promise<FetchEmailsOutput> {
    // Validate required environment variables
    validateEnv(ctx.env, [
      'GOOGLE_SERVICE_ACCOUNT_EMAIL',
      'GOOGLE_PRIVATE_KEY',
      'GOOGLE_IMPERSONATE_EMAIL',
    ]);

    const credentials: GoogleServiceAccountCredentials = {
      email: ctx.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
      privateKey: ctx.env.GOOGLE_PRIVATE_KEY!,
      impersonateEmail: ctx.env.GOOGLE_IMPERSONATE_EMAIL!,
    };

    // Get OAuth2 access token
    console.log('Getting Google access token...');
    const accessToken = await getGoogleAccessToken(credentials, [GMAIL_READONLY_SCOPE]);

    // Create Gmail client
    const gmail = new GmailClient({
      accessToken,
      userId: credentials.impersonateEmail,
    });

    // Calculate the "after" date
    const after = new Date();
    after.setHours(after.getHours() - input.hoursBack);

    // Fetch emails
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
