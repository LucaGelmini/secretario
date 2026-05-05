# Notes OCR with Vision Models - Research & Implementation Plan

## Context

User has a private GitHub repository with Obsidian vault (Markdown notes) and wants to:
1. Take photos of handwritten notes via Telegram
2. OCR the handwritten text using AI vision models
3. Automatically create Markdown files in the Obsidian vault
4. Commit and push to GitHub repository
5. Notes sync automatically to Obsidian vault via Git

---

## Vision Model Comparison (May 2026)

### Available Options

| Provider | Model | Input ($/M tokens) | Output ($/M tokens) | Free Tier | Notes |
|----------|-------|-------------------|---------------------|-----------|-------|
| **Cloudflare Workers AI** | Llama 3.2 11B Vision | $0.049 | $0.676 | ✅ 10k neurons/day | **RECOMMENDED** |
| **Cloudflare Workers AI** | Llama 4 Scout 17B | $0.270 | $0.850 | ✅ 10k neurons/day | Higher quality, more expensive |
| **Anthropic** | Claude 3.5 Haiku | $0.25 | $1.25 | ❌ Pay-as-you-go | Good handwriting OCR |
| **Anthropic** | Claude 3.5 Sonnet | $3.00 | $15.00 | ❌ Pay-as-you-go | Best quality, most expensive |
| **OpenAI** | GPT-4o mini | $0.15 | $0.60 | ❌ Pay-as-you-go | Good general vision |
| **DeepSeek** | (Any model) | N/A | N/A | ❌ No vision support | **NO OCR CAPABILITY** |

### Why Cloudflare Workers AI is the Best Choice

1. **Cost-effective**: 5x cheaper than Claude Haiku for input tokens
2. **Generous free tier**: 10,000 neurons/day = ~204 notes/day for free (6,120 notes/month!)
3. **Already integrated**: Worker already has `env.AI` binding configured
4. **Zero latency overhead**: No external HTTP calls, same datacenter
5. **Unified billing**: Same invoice as existing Cloudflare Workers infrastructure
6. **No additional API keys**: Uses existing Cloudflare account

---

## Cost Analysis (Cloudflare Llama 3.2 11B Vision)

### Per-Note Cost Estimation

**Assumptions:**
- Image size: 1024x1024 (typical smartphone photo)
- Input tokens: ~1,500 tokens (image encoding)
- Output tokens: ~500 tokens (title + markdown content + tags + metadata)

**Calculation:**
```
Input:  1,500 tokens × $0.049/M = $0.000074
Output:   500 tokens × $0.676/M = $0.000338
────────────────────────────────────────────
Total per note: $0.000412
```

### Monthly Cost Projections

| Usage | Cost/Month | Covered by Free Tier? |
|-------|------------|----------------------|
| 100 notes/month | $0.04 | ✅ Yes (100% free) |
| 500 notes/month | $0.21 | ✅ Yes (100% free) |
| 1,000 notes/month | $0.41 | ✅ Yes (100% free) |
| 10,000 notes/month | $4.12 | ⚠️ Partial (~50% free) |

**Free tier breakdown:**
- Daily limit: 10,000 neurons
- Neurons per note: ~49 (input + output combined)
- Free notes per day: ~204 notes
- Free notes per month: ~6,120 notes

---

## Technical Implementation Plan

### Architecture

```
┌─────────────────┐
│  Telegram Bot   │  User sends photo with /nota command
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Cloudflare Worker              │
│  - Download image from Telegram │
│  - Validate image format/size   │
└────────┬────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│  Workers AI (Llama 3.2 11B Vision)       │
│  @cf/meta/llama-3.2-11b-vision-instruct  │
│  - OCR handwritten text                  │
│  - Extract title, content, tags          │
│  - Structure as JSON                     │
└────────┬─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  GitHub API                         │
│  - Create Markdown file in vault   │
│  - Add frontmatter (tags, date)     │
│  - Commit to repo                   │
│  - Push to remote                   │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────┐
│  Telegram Response  │
│  - Confirmation msg │
│  - Link to GitHub   │
│  - Preview of note  │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│  Obsidian Vault     │
│  - Auto-sync via    │
│    Git pull         │
│  - Note appears     │
│    instantly        │
└─────────────────────┘
```

### Workflow Steps

1. **Telegram Handler** (`src/index.ts`)
   - Listen for `/nota` command + photo attachment
   - Validate auth (TELEGRAM_CHAT_ID guard)
   - Extract photo file_id and download from Telegram API

2. **OCR Operator** (`src/operators/ai/ocr-handwritten-note.ts`)
   - Accept image buffer (ArrayBuffer or Uint8Array)
   - Call Workers AI with vision prompt
   - Parse JSON response with structured fields

3. **GitHub Integration** (`src/integrations/github/client.ts`)
   - Create new GitHub client (similar to Gmail/Telegram)
   - Implement `createFile()` method using GitHub Contents API
   - Generate Markdown with YAML frontmatter
   - Commit directly to repo (no local git needed)

4. **Workflow Orchestration** (`src/workflows/note-ocr/workflow.ts`)
   - Step 1: Download image
   - Step 2: OCR extraction
   - Step 3: Format as Markdown with frontmatter
   - Step 4: Commit to GitHub repo
   - Step 5: Send confirmation with link

### Code Snippet (OCR Operator)

```typescript
// src/operators/ai/ocr-handwritten-note.ts

export interface HandwrittenNote {
  title: string;
  content: string; // Markdown format
  tags: string[];
  date?: string; // YYYY-MM-DD if visible in image
}

export async function ocrHandwrittenNote(
  ai: Ai,
  imageData: ArrayBuffer | Uint8Array
): Promise<HandwrittenNote> {
  const response = await ai.run(
    '@cf/meta/llama-3.2-11b-vision-instruct',
    {
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Extract all handwritten text from this image.
              
Analyze the content and structure it as JSON:
{
  "title": "main topic or first line (max 100 chars)",
  "content": "full transcription in markdown format (preserve line breaks, lists, emphasis)",
  "tags": ["relevant", "keywords", "from", "content"],
  "date": "YYYY-MM-DD if a date is visible in the image, otherwise null"
}

Important:
- Preserve original formatting (bullets, numbered lists, emphasis)
- Extract ALL visible text, even if partially obscured
- If handwriting is unclear, use [?] for uncertain words
- Generate 3-5 relevant tags based on content topics`
            },
            {
              type: 'image',
              image: Array.from(new Uint8Array(imageData))
            }
          ]
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3, // Lower temperature for more accurate OCR
      max_tokens: 2048
    }
  );

  return JSON.parse(response.response as string);
}
```

---

## GitHub + Obsidian Integration

### Why This is Perfect for Obsidian

1. **Native Markdown**: Obsidian works with plain Markdown files
2. **Git-based**: Obsidian vault is already a Git repo
3. **No API needed**: GitHub Contents API is all we need
4. **Auto-sync**: Obsidian Git plugin syncs automatically
5. **Version control**: Full Git history of all notes

### API Setup

1. Create GitHub Personal Access Token (classic)
   - Go to https://github.com/settings/tokens
   - Scope: `repo` (full control of private repositories)
   - Store as `GITHUB_TOKEN` in Cloudflare secrets

2. Configure repository info:
   - Store `GITHUB_OWNER` (username)
   - Store `GITHUB_REPO` (vault repository name)
   - Store `GITHUB_NOTES_PATH` (optional, default: `notes/`)

### Markdown Format with Frontmatter

```markdown
---
title: "Meeting Notes - Project X"
date: 2026-05-05
tags:
  - work
  - meetings
  - project-x
source: handwritten
created: 2026-05-05T14:30:00Z
---

# Meeting Notes - Project X

## Key Points

- Discussed timeline for Q2
- Need to hire 2 more engineers
- Budget approved for new tools

## Action Items

- [ ] Follow up with HR about hiring
- [ ] Research tools for team collaboration
- [ ] Schedule follow-up meeting next week
```

### GitHub Contents API Usage

```typescript
// src/integrations/github/client.ts

export class GitHubClient {
  async createFile(
    path: string,
    content: string,
    message: string
  ): Promise<{ url: string; sha: string }> {
    const response = await fetch(
      `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          message,
          content: btoa(content), // Base64 encode
          branch: 'main'
        })
      }
    );
    
    return response.json();
  }
}
```

---

## Security & Privacy Considerations

1. **Telegram Auth**: 
   - Already implemented: `TELEGRAM_CHAT_ID` guard in index.ts
   - Only respond to authorized user's chat ID

2. **Image Storage**:
   - Don't persist images in KV/R2 (privacy)
   - Optionally upload to GitHub repo `/attachments/` folder
   - Or just keep OCR text without storing original image

3. **GitHub Access**:
   - Use Personal Access Token (PAT) with minimal scope
   - Only `repo` permission needed
   - Store in Cloudflare secrets (encrypted at rest)

4. **Rate Limiting**:
   - Cloudflare Workers AI: 10k neurons/day free tier
   - GitHub API: 5,000 requests/hour for authenticated users
   - Telegram Bot API: 30 messages/second per chat

---

## Future Enhancements

1. **Multi-language support**: Llama 3.2 Vision supports 100+ languages
2. **Batch processing**: Send multiple photos, create one consolidated note
3. **Edit existing notes**: `/nota edit <page-id>` to update existing Notion pages
4. **Search & link**: Auto-link to existing notes based on tags/content similarity
5. **Voice notes**: Combine with Whisper for voice → text → Notion
6. **Diagram recognition**: Detect and describe diagrams/sketches in notes

---

## Implementation Checklist

- [ ] Create Notion integration and get API token
- [ ] Add `NOTION_API_KEY` to Cloudflare secrets
- [ ] Implement `NotionClient` class (`src/integrations/notion/client.ts`)
- [ ] Create OCR operator (`src/operators/ai/ocr-handwritten-note.ts`)
- [ ] Add Telegram photo download handler (`src/operators/telegram/download-photo.ts`)
- [ ] Create note-ocr workflow (`src/workflows/note-ocr/workflow.ts`)
- [ ] Add `/nota` command handler in `src/index.ts`
- [ ] Test with sample handwritten notes
- [ ] Document usage in main README
- [ ] Add example photos to docs (with permission)

---

## References

- [Cloudflare Workers AI - Llama 3.2 Vision](https://developers.cloudflare.com/workers-ai/models/llama-3.2-11b-vision-instruct/)
- [Cloudflare Workers AI Pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)
- [Notion API Documentation](https://developers.notion.com/)
- [Telegram Bot API - File Download](https://core.telegram.org/bots/api#getfile)

---

**Last Updated**: 2026-05-05  
**Status**: Research complete, ready for implementation
