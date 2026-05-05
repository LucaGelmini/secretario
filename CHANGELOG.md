# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


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

