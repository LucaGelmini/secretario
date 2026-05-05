import { IntegrationError } from '@/integrations/types';
import type {
  Email,
  EmailFilter,
  GmailConfig,
  GmailHeader,
  GmailLabel,
  GmailLabelsListResponse,
  GmailListMessagesResponse,
  GmailMessageFull,
  GmailModifyMessageRequest,
} from './types';

/**
 * Gmail API base URL
 */
const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1';

/**
 * Gmail API client
 *
 * Provides methods to interact with the Gmail API using OAuth2 authentication.
 */
export class GmailClient {
  private accessToken: string;
  private userId: string;

  constructor(config: GmailConfig) {
    this.accessToken = config.accessToken;
    this.userId = config.userId || 'me';
  }

  /**
   * Make an authenticated request to the Gmail API
   */
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${GMAIL_API_BASE}/users/${this.userId}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new IntegrationError(
        'gmail',
        `Gmail API request failed: ${error}`,
        response.status,
        'API_ERROR'
      );
    }

    return response.json<T>();
  }

  /**
   * Build a Gmail search query from a filter
   */
  private buildQuery(filter: EmailFilter): string {
    const parts: string[] = [];

    if (filter.query) {
      parts.push(filter.query);
    }

    if (filter.unreadOnly) {
      parts.push('is:unread');
    }

    if (filter.after) {
      const timestamp = Math.floor(filter.after.getTime() / 1000);
      parts.push(`after:${timestamp}`);
    }

    if (filter.before) {
      const timestamp = Math.floor(filter.before.getTime() / 1000);
      parts.push(`before:${timestamp}`);
    }

    return parts.join(' ');
  }

  /**
   * Get the value of a header from a message
   */
  private getHeader(headers: GmailHeader[], name: string): string {
    const header = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
    return header?.value || '';
  }

  /**
   * Decode base64url encoded data
   */
  private decodeBase64Url(data: string): string {
    try {
      // Replace URL-safe characters and add padding
      const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
      const padding = base64.length % 4 === 0 ? '' : '='.repeat(4 - (base64.length % 4));

      return atob(base64 + padding);
    } catch (error) {
      console.error('Failed to decode base64url:', error);
      return '';
    }
  }

  /**
   * Extract the body text from a message
   */
  private getMessageBody(message: GmailMessageFull): string {
    // Simple text extraction - just get the first text/plain part
    const { payload } = message;

    // Single part message
    if (payload.body?.data) {
      return this.decodeBase64Url(payload.body.data);
    }

    // Multipart message - find first text/plain part
    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body.data) {
          return this.decodeBase64Url(part.body.data);
        }
      }
    }

    return '';
  }

  /**
   * Convert a Gmail API message to our simplified Email type
   */
  private parseMessage(message: GmailMessageFull): Email {
    const headers = message.payload.headers;

    return {
      id: message.id,
      threadId: message.threadId,
      subject: this.getHeader(headers, 'Subject'),
      from: this.getHeader(headers, 'From'),
      to: this.getHeader(headers, 'To'),
      date: new Date(Number.parseInt(message.internalDate, 10)),
      snippet: message.snippet,
      body: this.getMessageBody(message),
      labels: message.labelIds,
    };
  }

  /**
   * List messages matching the filter
   *
   * @param filter - Filter criteria
   * @returns Array of message IDs and thread IDs
   */
  async listMessages(filter: EmailFilter = {}): Promise<{ id: string; threadId: string }[]> {
    const query = this.buildQuery(filter);
    const params = new URLSearchParams({
      maxResults: (filter.maxResults || 10).toString(),
    });

    if (query) {
      params.set('q', query);
    }

    if (filter.labelIds && filter.labelIds.length > 0) {
      for (const labelId of filter.labelIds) {
        params.append('labelIds', labelId);
      }
    }

    const response = await this.request<GmailListMessagesResponse>(
      `/messages?${params.toString()}`
    );

    return response.messages || [];
  }

  /**
   * Get a single message by ID
   *
   * @param messageId - Message ID
   * @returns Parsed email
   */
  async getMessage(messageId: string): Promise<Email> {
    const message = await this.request<GmailMessageFull>(`/messages/${messageId}?format=full`);
    return this.parseMessage(message);
  }

  /**
   * Fetch emails matching the filter
   *
   * This is a convenience method that lists messages and then fetches their full details.
   *
   * @param filter - Filter criteria
   * @returns Array of emails
   */
  async fetchEmails(filter: EmailFilter = {}): Promise<Email[]> {
    const messages = await this.listMessages(filter);

    if (messages.length === 0) {
      return [];
    }

    // Fetch full details for each message
    // Note: Gmail API doesn't support batch requests in Workers, so we fetch sequentially
    const emails: Email[] = [];
    for (const message of messages) {
      try {
        const email = await this.getMessage(message.id);
        emails.push(email);
      } catch (error) {
        console.error(`Failed to fetch message ${message.id}:`, error);
        // Continue with other messages
      }
    }

    return emails;
  }

  /**
   * List all labels in the user's mailbox
   *
   * @returns Array of labels
   */
  async listLabels(): Promise<GmailLabel[]> {
    const response = await this.request<GmailLabelsListResponse>('/labels');
    return response.labels || [];
  }

  /**
   * Get a label by ID
   *
   * @param labelId - Label ID
   * @returns Label details
   */
  async getLabel(labelId: string): Promise<GmailLabel> {
    return this.request<GmailLabel>(`/labels/${labelId}`);
  }

  /**
   * Create a new label
   *
   * @param name - Label name
   * @returns Created label
   */
  async createLabel(name: string): Promise<GmailLabel> {
    return this.request<GmailLabel>('/labels', {
      method: 'POST',
      body: JSON.stringify({
        name,
        labelListVisibility: 'labelShow',
        messageListVisibility: 'show',
      }),
    });
  }

  /**
   * Modify labels on a message
   *
   * @param messageId - Message ID
   * @param addLabelIds - Label IDs to add
   * @param removeLabelIds - Label IDs to remove
   */
  async modifyMessageLabels(
    messageId: string,
    addLabelIds?: string[],
    removeLabelIds?: string[]
  ): Promise<void> {
    const body: GmailModifyMessageRequest = {};
    if (addLabelIds && addLabelIds.length > 0) {
      body.addLabelIds = addLabelIds;
    }
    if (removeLabelIds && removeLabelIds.length > 0) {
      body.removeLabelIds = removeLabelIds;
    }

    await this.request(`/messages/${messageId}/modify`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * Add a label to a message
   *
   * @param messageId - Message ID
   * @param labelId - Label ID to add
   */
  async addLabel(messageId: string, labelId: string): Promise<void> {
    await this.modifyMessageLabels(messageId, [labelId]);
  }

  /**
   * Remove a label from a message
   *
   * @param messageId - Message ID
   * @param labelId - Label ID to remove
   */
  async removeLabel(messageId: string, labelId: string): Promise<void> {
    await this.modifyMessageLabels(messageId, undefined, [labelId]);
  }

  /**
   * Move a message to trash
   *
   * @param messageId - Message ID
   */
  async trashMessage(messageId: string): Promise<void> {
    await this.request(`/messages/${messageId}/trash`, {
      method: 'POST',
    });
  }

  /**
   * Archive a message (remove from INBOX)
   *
   * @param messageId - Message ID
   */
  async archiveMessage(messageId: string): Promise<void> {
    await this.modifyMessageLabels(messageId, undefined, ['INBOX']);
  }

  /**
   * Mark a message as read
   *
   * @param messageId - Message ID
   */
  async markAsRead(messageId: string): Promise<void> {
    await this.modifyMessageLabels(messageId, undefined, ['UNREAD']);
  }

  /**
   * Mark a message as unread
   *
   * @param messageId - Message ID
   */
  async markAsUnread(messageId: string): Promise<void> {
    await this.modifyMessageLabels(messageId, ['UNREAD']);
  }

  /**
   * Batch modify labels on multiple messages
   *
   * More efficient than modifying one by one. Gmail API supports up to 1000 messages per request.
   *
   * @param messageIds - Array of message IDs (max 1000)
   * @param addLabelIds - Label IDs to add
   * @param removeLabelIds - Label IDs to remove
   */
  async batchModify(
    messageIds: string[],
    addLabelIds?: string[],
    removeLabelIds?: string[]
  ): Promise<void> {
    if (messageIds.length === 0) {
      return;
    }

    if (messageIds.length > 1000) {
      throw new IntegrationError(
        'gmail',
        'Batch modify supports maximum 1000 messages per request'
      );
    }

    const body: { ids: string[]; addLabelIds?: string[]; removeLabelIds?: string[] } = {
      ids: messageIds,
    };

    if (addLabelIds && addLabelIds.length > 0) {
      body.addLabelIds = addLabelIds;
    }

    if (removeLabelIds && removeLabelIds.length > 0) {
      body.removeLabelIds = removeLabelIds;
    }

    await this.request('/messages/batchModify', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }
}
