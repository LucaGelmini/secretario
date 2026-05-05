#!/usr/bin/env bun

/**
 * Get Gmail Refresh Token - Simple Version
 *
 * Use this if you already have OAuth2 credentials created.
 * Just paste your Client ID and Secret, then follow the auth flow.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob';

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

async function main() {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║   Get Gmail Refresh Token - Secretario                   ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    // Option to use JSON file
    const hasJson = await prompt('Do you have the credentials JSON file downloaded? (y/n): ');

    let config: OAuth2Config;

    if (hasJson.toLowerCase() === 'y') {
      const jsonPath = await prompt('Enter path to the JSON file: ');

      if (!fs.existsSync(jsonPath)) {
        throw new Error(`File not found: ${jsonPath}`);
      }

      const jsonContent = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      const installed = jsonContent.installed || jsonContent.web;

      config = {
        clientId: installed.client_id,
        clientSecret: installed.client_secret,
      };

      console.log('\n✓ Credentials loaded from JSON');
    } else {
      console.log('\nPaste your OAuth2 credentials:');
      const clientId = await prompt('Client ID: ');
      const clientSecret = await prompt('Client Secret: ');

      config = { clientId, clientSecret };
    }

    // Generate auth URL
    console.log('\n🔗 Step 1: Authorize the Application');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('\nOpen this URL in your browser:\n');
    console.log(generateAuthUrl(config));
    console.log('\n1. Log in with your Gmail account (lfgelmini@gmail.com)');
    console.log('2. You may see "Google hasn\'t verified this app" - click "Continue"');
    console.log('3. Click "Allow" to grant Gmail read access');
    console.log('4. Copy the authorization code shown\n');

    const authCode = await prompt('Paste the authorization code here: ');

    // Exchange for tokens
    console.log('\n🔄 Exchanging code for refresh token...');
    const tokens = await exchangeCodeForTokens(config, authCode);

    if (!tokens.refresh_token) {
      console.log('\n❌ No refresh token received.');
      console.log('\nThis means you already authorized this app before.');
      console.log('To fix:');
      console.log('1. Go to: https://myaccount.google.com/permissions');
      console.log('2. Find and remove "Secretario"');
      console.log('3. Run this script again\n');
      process.exit(1);
    }

    console.log('\n✅ Success! Here are your credentials:\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('\nAdd these to .dev.vars:\n');
    console.log(`GOOGLE_CLIENT_ID=${config.clientId}`);
    console.log(`GOOGLE_CLIENT_SECRET=${config.clientSecret}`);
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log('\n═══════════════════════════════════════════════════════════');

    // Save to .dev.vars
    const saveNow = await prompt('\nSave to .dev.vars now? (y/n): ');

    if (saveNow.toLowerCase() === 'y') {
      const projectRoot = path.join(__dirname, '..');
      const devVarsPath = path.join(projectRoot, '.dev.vars');

      const content = `# Google OAuth2 for Gmail API
GOOGLE_CLIENT_ID=${config.clientId}
GOOGLE_CLIENT_SECRET=${config.clientSecret}
GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}

# Telegram Bot (add these later)
# TELEGRAM_BOT_TOKEN=
# TELEGRAM_CHAT_ID=

# DeepSeek AI (add this later)
# DEEPSEEK_API_KEY=
`;

      fs.writeFileSync(devVarsPath, content);
      console.log(`\n✓ Saved to ${devVarsPath}`);
    }

    console.log('\n✨ Setup complete!\n');
    console.log('Next steps:');
    console.log('  1. Test locally: bun run dev');
    console.log('  2. Trigger: curl http://localhost:8787/trigger');
    console.log('  3. Deploy: bun run deploy\n');
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
