# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [0.5.0] - 2026-06-08

### Added

- Centralized error reporting to Telegram via a single `reportError` helper that surfaces every unhandled error as a Telegram alert
- End-to-end smoke test for error reporting (`scripts/smoke-test-errors.ts`)

### Fixed

- All fetch entrypoints now catch and report errors through the centralized reporter, except the Telegram webhook which keeps its own catch to always return 200

### Internal

- Add async safety-net catch to fetch entrypoints that do not need special response handling
- Ensure scheduled tasks and EmailDigestWorkflow rethrow errors after reporting to preserve Cloudflare failure semantics


## [0.4.0] - 2026-06-08

### Added
- Add `/reauth` Telegram command that lets users self-service Gmail re-authentication on demand
- Schedule automatic re-auth link generation every 5 days to maintain a 2-day buffer before Google's 7-day token expiry
- Add KV-first token storage, reading from KV and falling back to the `GOOGLE_REFRESH_TOKEN` environment variable
- Add identity guard on the OAuth callback to reject tokens from unexpected email accounts
- Add one-time state nonce with a 15-minute TTL to prevent replay attacks on the callback URL

### Changed
- Refactor monolithic `index.ts` into separate modules: `router.ts` for dispatch, `handlers.ts` for route handlers, and a minimal entrypoint
- Extract `confirmRule` logic to `src/operators/telegram/confirm-rule.ts`
- Extract HTML response helper to `src/shared/html.ts`
- Add `CRONS` constant in `index.ts` to centralize cron schedule definitions


## [0.3.1] - 2026-05-07

### Fixed
- Resolve Gmail label application failure by adding the missing `gmail.modify` OAuth scope
- Handle 204 No Content responses in Gmail client to prevent JSON parse errors

### Changed
- Protect `/trigger` endpoint with Bearer token authentication

### Internal
- Update `get-refresh-token` script to replace deprecated OOB redirect with local HTTP server, expand `~` in paths, and preserve existing `.dev.vars` on save


## [0.3.0] - 2026-05-05

### Added
- Automated Gmail classification and cleanup workflow with daily cron trigger at 8:30 AM Argentina time
- Declarative workflow configuration system
- Gmail classification rules with 595 hardcoded patterns
- Deterministic classification operator with KV-learned rules and AI fallback
- Email organization operator supporting batch label and delete operations
- Batch modify support in GmailClient for efficient bulk operations
- Prompt injection protection with input sanitization and hardened system prompts
- Telegram authentication guard restricting access to authorized chat IDs only
- Rule confirmation flow via Telegram with simple number responses
- KV namespace for learned rules with 7-day expiration on pending confirmations
- Workflow configuration imported from package.json

### Changed
- Updated workflow to 6-step pipeline: fetch, classify, organize, summarize, send digest, send suggestions
- Extended OAuth scopes to include gmail.modify and gmail.labels

### Security
- Telegram webhook restricted to respond only to authorized TELEGRAM_CHAT_ID
- AI prompts hardened against injection attacks
- Email content sanitized before AI processing
- Learned rules require explicit user confirmation before activation


## [0.2.0] - 2026-05-05

### Added

- Add release type and version to workflow title and summary


## [0.1.1] - 2026-05-05

### Fixed
- Add Node.js 22 setup for Wrangler compatibility
- Improve telegram message formatting in release workflow
- Only run release workflow on manual dispatch
- Fix YAML syntax error in release workflow


## [0.1.0] - 2026-05-05

### Added

- Add Gmail integration with OAuth2 authentication using refresh tokens, supporting personal Gmail accounts without Workspace requirement
- Add DeepSeek AI integration for email summarization with Spanish/English language support and brief/detailed summary styles
- Add Telegram integration with webhook handler, `/digest` command, and Bot API support for sending messages
- Add Markdown to Telegram HTML formatter that handles Telegram HTML limitations by converting lists to plain text with bullets
- Add barrel exports (`index.ts`) to all module folders for cleaner imports
- Add error logging in Telegram client and improve DeepSeek error handling
- Add OAuth2 setup scripts for Gmail integration and Telegram bot configuration
- Add comprehensive documentation for Google Service Account and OAuth2 setup

### Changed

- Switch from service account authentication to OAuth2 refresh token flow for personal Gmail accounts
- Convert operators from arrow functions to objects with `execute` method for better type safety
- Update workflow to use AI summarization instead of plain email list
- Update workflow to send email digest to Telegram
- Update `fetch-emails` operator to use OAuth2 refresh tokens
- Update `Env` types to use OAuth2 credentials
- Update `DEPLOY.md` with correct OAuth2 secrets
- Update `IntegrationError` constructor signature to accept integration first
- Update all `IntegrationError` subclasses with correct parameter order
- Update workflow to use HTML `parse_mode` for Telegram messages

### Fixed

- Fix all TypeScript type errors across the codebase (verified with `tsc --noEmit`)
- Fix `Telegram.apiRequest` to accept object types
- Fix `validateEnv` to accept `Env` type
- Fix all linting issues including unused imports and variables

### Removed

- Remove outdated `GOOGLE_SETUP.md` (Service Account approach)
- Archive obsolete Gmail setup scripts

### Documentation

- Move all documentation to `docs/` folder while keeping `README.md` in root
- Create `docs/README.md` as documentation index
- Simplify main `README.md` with quick start guide
- Add Telegram setup guide and update README

