import { GmailClient } from '@/integrations/gmail/client';
import { getAccessTokenFromRefreshToken } from '@/integrations/google/auth';
import type { GoogleOAuth2Credentials } from '@/integrations/google/types';
import type { Operator, OperatorContext } from '@/operators/types';
import { validateEnv } from '@/shared/errors';
import type { OrganizeEmailsInput, OrganizeEmailsOutput } from './types';

/**
 * Batch size for Gmail API operations
 */
const BATCH_SIZE = 100;

/**
 * Operator: Organize emails by applying labels, deleting, etc.
 *
 * Takes classified emails and executes the corresponding actions:
 * - label: Add Gmail label
 * - delete: Move to trash
 * - review: Do nothing (for manual review)
 *
 * Uses batch operations where possible for efficiency.
 */
export const organizeEmailsOperator: Operator<OrganizeEmailsInput, OrganizeEmailsOutput> = {
  name: 'organize-emails',

  async execute(input, ctx: OperatorContext): Promise<OrganizeEmailsOutput> {
    const { classified } = input;
    const { env } = ctx;

    // Validate required environment variables
    validateEnv(ctx.env, ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN']);

    const credentials: GoogleOAuth2Credentials = {
      clientId: env.GOOGLE_CLIENT_ID!,
      clientSecret: env.GOOGLE_CLIENT_SECRET!,
      refreshToken: env.GOOGLE_REFRESH_TOKEN!,
    };

    // Get OAuth2 access token
    console.log('Getting Google access token...');
    const accessToken = await getAccessTokenFromRefreshToken(credentials);

    // Create Gmail client
    const gmail = new GmailClient({ accessToken });

    // Stats
    let labeled = 0;
    let deleted = 0;
    let errors = 0;
    const statsByCategory: Record<string, number> = {};
    const statsByAction: Record<string, number> = {};

    // Fetch all available labels once
    console.log('Fetching Gmail labels...');
    const allLabels = await gmail.listLabels();
    const labelMap = new Map<string, string>();
    for (const label of allLabels) {
      labelMap.set(label.name, label.id);
    }

    // Group classified emails by action and label
    const toDelete: string[] = [];
    const toLabelByName = new Map<string, string[]>(); // labelName -> messageIds[]

    for (const c of classified) {
      const { email, classification } = c;
      const { action, labelName, category } = classification;

      // Update stats
      statsByCategory[category] = (statsByCategory[category] || 0) + 1;
      statsByAction[action] = (statsByAction[action] || 0) + 1;

      if (action === 'delete') {
        toDelete.push(email.id);
      } else if (action === 'label' && labelName) {
        if (!toLabelByName.has(labelName)) {
          toLabelByName.set(labelName, []);
        }
        toLabelByName.get(labelName)!.push(email.id);
      }
      // action === 'review' -> do nothing
    }

    console.log(`Organizing: ${toDelete.length} to delete, ${toLabelByName.size} label groups`);

    // Step 1: Apply labels (batch by label)
    for (const [labelName, messageIds] of toLabelByName) {
      let labelId = labelMap.get(labelName);

      // Create label if it doesn't exist
      if (!labelId) {
        try {
          console.log(`Creating label: ${labelName}`);
          const newLabel = await gmail.createLabel(labelName);
          labelId = newLabel.id;
          labelMap.set(labelName, labelId);
        } catch (error) {
          console.error(`Failed to create label ${labelName}:`, error);
          errors++;
          continue;
        }
      }

      // Apply label in batches
      for (let i = 0; i < messageIds.length; i += BATCH_SIZE) {
        const batch = messageIds.slice(i, i + BATCH_SIZE);
        try {
          await gmail.batchModify(batch, [labelId]);
          labeled += batch.length;
          console.log(`Labeled ${labeled}/${messageIds.length} with "${labelName}"`);
        } catch (error) {
          console.error(`Failed to label batch for ${labelName}:`, error);
          errors += batch.length;
        }
      }
    }

    // Step 2: Delete emails (batch)
    for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
      const batch = toDelete.slice(i, i + BATCH_SIZE);
      try {
        // Move to trash by adding TRASH label and removing INBOX
        await gmail.batchModify(batch, ['TRASH'], ['INBOX']);
        deleted += batch.length;
        console.log(`Deleted ${deleted}/${toDelete.length} emails`);
      } catch (error) {
        console.error('Failed to delete batch:', error);
        errors += batch.length;
      }
    }

    console.log(`Organization complete: ${labeled} labeled, ${deleted} deleted, ${errors} errors`);

    return {
      labeled,
      deleted,
      errors,
      stats: {
        byCategory: statsByCategory,
        byAction: statsByAction,
      },
    };
  },
};
