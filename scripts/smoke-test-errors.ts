#!/usr/bin/env bun
/**
 * Smoke test for the error reporter.
 *
 * Triggers a real error through each testable path, verifies the HTTP contract
 * is preserved, and prints exactly what Telegram message to expect.
 *
 * Prerequisites:
 *   npm run dev   (wrangler dev must be running on port 8787)
 */

import fs from 'node:fs';
import path from 'node:path';

const DEV_SERVER = 'http://localhost:8787';
const projectRoot = path.join(import.meta.dir, '..');

// ─── helpers ────────────────────────────────────────────────────────────────

function readDevVars(): Record<string, string> {
  const file = path.join(projectRoot, '.dev.vars');
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(file, 'utf-8')
      .split('\n')
      .filter((l) => l.includes('=') && !l.startsWith('#'))
      .map((l) => {
        const idx = l.indexOf('=');
        return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
      })
  );
}

function pass(msg: string) {
  console.log(`  ✅ ${msg}`);
}
function fail(msg: string) {
  console.error(`  ❌ ${msg}`);
}
function info(msg: string) {
  console.log(`  ${msg}`);
}

let failures = 0;

function assert(condition: boolean, onPass: string, onFail: string) {
  if (condition) {
    pass(onPass);
  } else {
    fail(onFail);
    failures++;
  }
}

// ─── test cases ─────────────────────────────────────────────────────────────

async function checkDevServer(): Promise<boolean> {
  try {
    const res = await fetch(`${DEV_SERVER}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function testWebhookErrorPath(env: Record<string, string>) {
  console.log('\n📋 Test: telegram-webhook error path');
  info('Sending non-JSON body to POST /telegram/webhook');

  const res = await fetch(`${DEV_SERVER}/telegram/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: 'not-valid-json{{{{',
  });

  assert(res.status === 200, `Response is 200 (webhook contract preserved)`, `Expected 200, got ${res.status}`);

  console.log('\n  📱 Check Telegram — expect a message like:');
  console.log('  ┌─────────────────────────────────────────');
  console.log('  │ 🚨 secretario error');
  console.log('  │');
  console.log('  │ Context: telegram-webhook');
  console.log('  │ SyntaxError: <JSON parse error>');
  console.log('  └─────────────────────────────────────────');
  if (env.TELEGRAM_CHAT_ID) info(`Chat ID: ${env.TELEGRAM_CHAT_ID}`);
}

async function testScheduledPath(env: Record<string, string>) {
  console.log('\n📋 Test: scheduled cron error path (optional)');
  info('Requires: npm run dev -- --test-scheduled');

  try {
    const res = await fetch(
      `${DEV_SERVER}/__scheduled?cron=${encodeURIComponent('30 11 * * *')}`,
      { method: 'GET', signal: AbortSignal.timeout(10000) }
    );

    if (res.status === 404) {
      info('⚠️  Skipped — restart dev server with --test-scheduled to enable this path.');
      return;
    }

    assert(res.status === 200, 'Scheduled endpoint responded 200', `Unexpected status ${res.status}`);
    info('No Telegram alert expected unless Gmail/DeepSeek credentials are invalid.');
    info('To force an error: set DEEPSEEK_API_KEY=invalid in .dev.vars and re-run.');
  } catch (e) {
    fail(`Request failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ─── main ────────────────────────────────────────────────────────────────────

const env = readDevVars();

console.log('🔍 Checking dev server at', DEV_SERVER);
if (!(await checkDevServer())) {
  console.error('\n❌ Dev server not reachable. Start it first:\n\n  npm run dev\n');
  process.exit(1);
}
pass('Dev server is up');

await testWebhookErrorPath(env);
await testScheduledPath(env);

console.log('\n' + '─'.repeat(50));
if (failures === 0) {
  console.log('✅ All assertions passed. Verify the Telegram message manually.');
} else {
  console.log(`❌ ${failures} assertion(s) failed.`);
  process.exit(1);
}
