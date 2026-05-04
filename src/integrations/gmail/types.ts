/**
 * Gmail API configuration
 */
export interface GmailConfig {
  /**
   * OAuth2 access token
   */
  accessToken: string;

  /**
   * Email address of the user to access (who we're impersonating)
   */
  userId?: string;
}

/**
 * Gmail message metadata
 */
export interface GmailMessage {
  /**
   * Message ID
   */
  id: string;

  /**
   * Thread ID
   */
  threadId: string;
}

/**
 * Gmail message full details
 */
export interface GmailMessageFull extends GmailMessage {
  /**
   * Message snippet (preview text)
   */
  snippet: string;

  /**
   * Internal date (Unix timestamp in milliseconds)
   */
  internalDate: string;

  /**
   * Message payload (headers, body, etc.)
   */
  payload: GmailMessagePayload;

  /**
   * Label IDs
   */
  labelIds?: string[];
}

/**
 * Gmail message payload
 */
export interface GmailMessagePayload {
  /**
   * Message headers
   */
  headers: GmailHeader[];

  /**
   * MIME type
   */
  mimeType: string;

  /**
   * Message body (for text/plain or text/html)
   */
  body?: GmailMessageBody;

  /**
   * Parts (for multipart messages)
   */
  parts?: GmailMessagePart[];
}

/**
 * Gmail message header
 */
export interface GmailHeader {
  name: string;
  value: string;
}

/**
 * Gmail message body
 */
export interface GmailMessageBody {
  /**
   * Base64url encoded data
   */
  data?: string;

  /**
   * Size in bytes
   */
  size: number;
}

/**
 * Gmail message part (for multipart messages)
 */
export interface GmailMessagePart {
  mimeType: string;
  body: GmailMessageBody;
  headers?: GmailHeader[];
  parts?: GmailMessagePart[];
}

/**
 * Gmail API list messages response
 */
export interface GmailListMessagesResponse {
  messages?: GmailMessage[];
  nextPageToken?: string;
  resultSizeEstimate?: number;
}

/**
 * Simplified email representation
 */
export interface Email {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: Date;
  snippet: string;
  body?: string;
  labels?: string[];
}

/**
 * Filter for fetching emails
 */
export interface EmailFilter {
  /**
   * Maximum number of emails to fetch
   */
  maxResults?: number;

  /**
   * Only fetch emails after this date
   */
  after?: Date;

  /**
   * Only fetch emails before this date
   */
  before?: Date;

  /**
   * Only fetch unread emails
   */
  unreadOnly?: boolean;

  /**
   * Label IDs to filter by
   */
  labelIds?: string[];

  /**
   * Gmail search query (e.g., "from:example@gmail.com")
   */
  query?: string;
}
