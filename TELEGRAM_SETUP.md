# Telegram Bot Setup Guide

This guide will help you set up a Telegram bot for Secretario.

## Prerequisites

- A Telegram account
- Access to Telegram on your phone or desktop

## Step 1: Create a Bot with BotFather

1. Open Telegram and search for `@BotFather`
2. Start a chat and send `/newbot`
3. Follow the prompts:
   - Choose a name for your bot (e.g., "Secretario")
   - Choose a username (must end in "bot", e.g., "my_secretario_bot")
4. BotFather will give you a **bot token**. Save this!
   - Format: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`

## Step 2: Get Your Chat ID

### Option A: Automated (Recommended)

Run the setup script:

```bash
bun run scripts/setup-telegram.ts
```

The script will:
- Verify your bot token
- Help you find your chat ID
- Optionally configure the webhook
- Save everything to `.dev.vars`

### Option B: Manual

1. Send a message to your bot on Telegram (e.g., `/start`)
2. Open this URL in your browser (replace `<TOKEN>` with your bot token):
   ```
   https://api.telegram.org/bot<TOKEN>/getUpdates
   ```
3. Look for `"chat":{"id":123456789}` in the JSON response
4. Save the `id` value - that's your **chat ID**

## Step 3: Configure Environment Variables

Add to `.dev.vars` (for local development):

```env
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=123456789
```

Add to production secrets (after deploying):

```bash
bunx wrangler secret put TELEGRAM_BOT_TOKEN
# Paste your token when prompted

bunx wrangler secret put TELEGRAM_CHAT_ID
# Paste your chat ID when prompted
```

## Step 4: Set Webhook (Production Only)

After deploying your Worker, set the webhook URL:

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://secretario.YOUR_USERNAME.workers.dev/telegram/webhook"}'
```

Replace:
- `<TOKEN>` with your bot token
- `YOUR_USERNAME` with your Cloudflare Workers subdomain

Verify webhook:

```bash
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

## Step 5: Test the Bot

### Local Testing

1. Start the dev server:
   ```bash
   bun run dev
   ```

2. Trigger the workflow manually:
   ```bash
   curl http://localhost:8787/trigger
   ```

3. You should receive a message in your Telegram chat!

### Production Testing

1. Deploy:
   ```bash
   bun run deploy
   ```

2. Send `/digest` command to your bot on Telegram

3. The bot should reply with your email digest!

## Available Commands

- `/digest` - Trigger the email digest workflow and receive a summary in Telegram

## Troubleshooting

### No message received

1. Check that `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are set correctly
2. Check Worker logs: `bunx wrangler tail`
3. Verify webhook is set: `curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo`

### "Unauthorized" error

- Your bot token is invalid or expired. Create a new bot with BotFather.

### Wrong chat receiving messages

- Double-check your `TELEGRAM_CHAT_ID`. Each user has a unique chat ID.

## Next Steps

- Set up scheduled triggers in `wrangler.jsonc` to receive daily digests automatically
- Customize the digest format in `src/workflows/email-digest/workflow.ts`
- Add DeepSeek AI integration for summarized digests (Step 4)
