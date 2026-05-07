#!/usr/bin/env bun

/**
 * Get Gmail Refresh Token
 *
 * Use this if you already have OAuth2 credentials created.
 * Starts a local HTTP server to handle the OAuth2 callback.
 *
 * Scopes requested:
 * - gmail.modify: Read, send, delete, and manage email and labels
 * - gmail.labels: Manage labels
 */

import * as fs from 'node:fs';
import * as http from 'node:http';
import * as path from 'node:path';
import * as readline from 'node:readline';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.labels',
];
const REDIRECT_PORT = 3000;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}`;

interface OAuth2Config {
  clientId: string;
  clientSecret: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function generateAuthUrl(config: OAuth2Config): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

async function exchangeCodeForTokens(config: OAuth2Config, code: string): Promise<TokenResponse> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code for tokens: ${error}`);
  }

  return response.json();
}

/**
 * Start a local HTTP server to receive the OAuth2 callback
 */
function waitForAuthCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url || '', `http://localhost:${REDIRECT_PORT}`);

      if (url.pathname === '/' || url.pathname === '/callback') {
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');

        if (error) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(`<h1>Error</h1><p>${error}</p><p>You can close this window.</p>`);
          server.close();
          reject(new Error(`OAuth error: ${error}`));
          return;
        }

        if (code) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(
            '<h1>Authorization successful!</h1><p>You can close this window and return to the terminal.</p>'
          );
          server.close();
          resolve(code);
          return;
        }

        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>Error</h1><p>No authorization code received.</p>');
        server.close();
        reject(new Error('No authorization code received'));
      }
    });

    server.listen(REDIRECT_PORT, () => {
      console.log(`\nCallback server listening on http://localhost:${REDIRECT_PORT}/callback`);
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      server.close();
      reject(new Error('Timeout waiting for authorization (5 minutes)'));
    }, 5 * 60 * 1000);
  });
}

async function main() {
  console.log('');
  console.log('==========================================================');
  console.log('   Get Gmail Refresh Token - Secretario');
  console.log('==========================================================');
  console.log('');

  try {
    // Option to use JSON file
    const hasJson = await prompt('Do you have the credentials JSON file downloaded? (y/n): ');

    let config: OAuth2Config;

    if (hasJson.toLowerCase() === 'y') {
      let jsonPath = await prompt('Enter path to the JSON file: ');
      // Expand ~ to home directory
      if (jsonPath.startsWith('~')) {
        jsonPath = jsonPath.replace('~', process.env.HOME || '');
      }

      if (!fs.existsSync(jsonPath)) {
        throw new Error(`File not found: ${jsonPath}`);
      }

      const jsonContent = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      const installed = jsonContent.installed || jsonContent.web;

      config = {
        clientId: installed.client_id,
        clientSecret: installed.client_secret,
      };

      console.log('\n> Credentials loaded from JSON');
    } else {
      console.log('\nPaste your OAuth2 credentials:');
      const clientId = await prompt('Client ID: ');
      const clientSecret = await prompt('Client Secret: ');

      config = { clientId, clientSecret };
    }

    // Note: Desktop app type uses loopback redirect automatically

    // Generate auth URL
    console.log('\nStep 1: Authorize the Application');
    console.log('==========================================================');
    console.log('\nOpen this URL in your browser:\n');
    console.log(generateAuthUrl(config));
    console.log('\n1. Log in with your Gmail account');
    console.log('2. You may see "Google hasn\'t verified this app" - click "Continue"');
    console.log('3. Click "Allow" to grant Gmail access (read, modify, labels)');
    console.log('4. You will be redirected back automatically\n');

    // Start local server and wait for callback
    const authCode = await waitForAuthCode();
    console.log('\n> Authorization code received!');

    // Exchange for tokens
    console.log('\nStep 2: Exchanging code for refresh token...');
    const tokens = await exchangeCodeForTokens(config, authCode);

    if (!tokens.refresh_token) {
      console.log('\nERROR: No refresh token received.');
      console.log('\nThis means you already authorized this app before.');
      console.log('To fix:');
      console.log('1. Go to: https://myaccount.google.com/permissions');
      console.log('2. Find and remove "Secretario"');
      console.log('3. Run this script again\n');
      process.exit(1);
    }

    console.log('\n> Scopes granted:', tokens.scope);

    console.log('\n==========================================================');
    console.log(' SUCCESS! Here are your credentials:');
    console.log('==========================================================\n');
    console.log(`GOOGLE_CLIENT_ID=${config.clientId}`);
    console.log(`GOOGLE_CLIENT_SECRET=${config.clientSecret}`);
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log('\n==========================================================');

    // Save to .dev.vars
    const saveNow = await prompt('\nSave to .dev.vars now? (y/n): ');

    if (saveNow.toLowerCase() === 'y') {
      const projectRoot = path.join(__dirname, '..');
      const devVarsPath = path.join(projectRoot, '.dev.vars');

      // Read existing .dev.vars to preserve other settings
      let existingContent = '';
      if (fs.existsSync(devVarsPath)) {
        existingContent = fs.readFileSync(devVarsPath, 'utf-8');
      }

      // Update or add Google credentials
      const updates: Record<string, string> = {
        GOOGLE_CLIENT_ID: config.clientId,
        GOOGLE_CLIENT_SECRET: config.clientSecret,
        GOOGLE_REFRESH_TOKEN: tokens.refresh_token,
      };

      let newContent = existingContent;
      for (const [key, value] of Object.entries(updates)) {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        if (regex.test(newContent)) {
          newContent = newContent.replace(regex, `${key}=${value}`);
        } else {
          newContent += `\n${key}=${value}`;
        }
      }

      fs.writeFileSync(devVarsPath, newContent.trim() + '\n');
      console.log(`\n> Saved to ${devVarsPath}`);
    }

    console.log('\nNext steps:');
    console.log('  1. Update the Cloudflare secret:');
    console.log(`     npx wrangler secret put GOOGLE_REFRESH_TOKEN`);
    console.log('  2. Test: curl https://secretario.lucagelmini.workers.dev/trigger');
    console.log('');
  } catch (error) {
    console.error('\nERROR:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
