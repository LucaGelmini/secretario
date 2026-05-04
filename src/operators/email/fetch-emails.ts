import { GmailClient } from '@/integrations/gmail/client';
import { getAccessTokenFromRefreshToken } from '@/integrations/google/auth';
import type { GoogleOAuth2Credentials } from '@/integrations/google/types';
import type { Operator, OperatorContext } from '@/operators/types';
import { validateEnv } from '@/shared/errors';
import type { FetchEmailsInput, FetchEmailsOutput } from './types';

/**
 * Fetch emails operator
 *
 * This operator:
 * 1. Authenticates with Google using OAuth2 refresh token
 * 2. Fetches emails from Gmail using the Gmail API
 * 3. Returns the emails with their subjects, senders, and snippets
 */
export const fetchEmailsOperator: Operator<FetchEmailsInput, FetchEmailsOutput> = {
  name: 'fetch-emails',

  async execute(input, ctx: OperatorContext): Promise<FetchEmailsOutput> {
    // Validate required environment variables
    validateEnv(ctx.env, ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN']);

    const credentials: GoogleOAuth2Credentials = {
      clientId: ctx.env.GOOGLE_CLIENT_ID!,
      clientSecret: ctx.env.GOOGLE_CLIENT_SECRET!,
      refreshToken: ctx.env.GOOGLE_REFRESH_TOKEN!,
    };

    // Get OAuth2 access token from refresh token
    console.log('Getting Google access token from refresh token...');
    const accessToken = await getAccessTokenFromRefreshToken(credentials);

    // Create Gmail client
    const gmail = new GmailClient({
      accessToken,
      userId: 'me', // 'me' refers to the authenticated user
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
