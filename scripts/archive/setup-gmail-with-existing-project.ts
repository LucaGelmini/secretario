#!/usr/bin/env bun

/**
 * Gmail OAuth2 Setup - Using Existing GCP Project
 *
 * This script sets up OAuth2 for Gmail using your existing GCP project.
 * It will:
 * 1. List your projects and let you choose
 * 2. Enable Gmail API
 * 3. Guide you through creating OAuth2 credentials
 * 4. Get refresh token and save to .dev.vars
 *
 * Usage:
 *   bun run scripts/setup-gmail-with-existing-project.ts
 */

import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';

const GCLOUD_PATH = `${process.env.HOME}/google-cloud-sdk/bin/gcloud`;
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

async function runCommand(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: ['inherit', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`Command failed: ${stderr || stdout}`));
      }
    });
  });
}

async function checkGcloudAuth(): Promise<string> {
  try {
    const output = await runCommand(GCLOUD_PATH, [
      'auth',
      'list',
      '--filter=status:ACTIVE',
      '--format=value(account)',
    ]);
    const account = output.trim().split('\n')[0];
    if (account) {
      return account;
    }
  } catch {}

  console.log('\n🔐 Authenticating with Google Cloud...\n');
  await runCommand(GCLOUD_PATH, ['auth', 'login', '--brief']);

  const output = await runCommand(GCLOUD_PATH, [
    'auth',
    'list',
    '--filter=status:ACTIVE',
    '--format=value(account)',
  ]);
  return output.trim().split('\n')[0]!;
}

async function selectProject(): Promise<string> {
  console.log('\n📦 Your Google Cloud Projects:\n');

  const projects = await runCommand(GCLOUD_PATH, [
    'projects',
    'list',
    '--format=table(projectId,name)',
  ]);
  console.log(projects);

  const projectId = await prompt('\nEnter the Project ID to use (e.g., service-accounts-492120): ');

  await runCommand(GCLOUD_PATH, ['config', 'set', 'project', projectId]);

  return projectId;
}

async function enableApis(projectId: string): Promise<void> {
  console.log('\n🔌 Enabling Gmail API...');

  try {
    await runCommand(GCLOUD_PATH, [
      'services',
      'enable',
      'gmail.googleapis.com',
      `--project=${projectId}`,
    ]);
    console.log('✓ Gmail API enabled');
  } catch (_error) {
    console.log('⚠️  Gmail API may already be enabled or you need to enable billing');
    console.log(
      `   Check: https://console.cloud.google.com/apis/library/gmail.googleapis.com?project=${projectId}`
    );
  }
}

async function getOAuth2Credentials(projectId: string, account: string): Promise<OAuth2Config> {
  console.log('\n🔑 OAuth2 Credentials Setup\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('\nYou need to create OAuth2 credentials in the console.');
  console.log('Follow these steps:\n');
  console.log(`1. Open: https://console.cloud.google.com/apis/credentials?project=${projectId}\n`);

  // Check if consent screen is configured
  console.log('2. If you see "Configure Consent Screen", click it:');
  console.log('   - User Type: External');
  console.log('   - App name: Secretario');
  console.log(`   - User support email: ${account}`);
  console.log(`   - Developer email: ${account}`);
  console.log('   - Save and Continue\n');
  console.log('3. In "Scopes", click "Add or Remove Scopes"');
  console.log('   - Search for: https://www.googleapis.com/auth/gmail.readonly');
  console.log('   - Check the box, Update, Save and Continue\n');
  console.log('4. In "Test users", click "Add Users"');
  console.log(`   - Add: ${account}`);
  console.log('   - Save and Continue, then Back to Dashboard\n');
  console.log('5. Go back to Credentials tab, click "Create Credentials" > "OAuth client ID"');
  console.log('   - Application type: Desktop app');
  console.log('   - Name: Secretario Gmail Access');
  console.log('   - Create');
  console.log('   - Download JSON or copy Client ID and Secret\n');

  await prompt('Press Enter when you have the credentials...');

  const hasJson = await prompt('\nDo you have the JSON file? (y/n): ');

  if (hasJson.toLowerCase() === 'y') {
    const jsonPath = await prompt('Enter path to credentials JSON: ');

    if (!fs.existsSync(jsonPath)) {
      throw new Error(`File not found: ${jsonPath}`);
    }

    const jsonContent = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    const installed = jsonContent.installed || jsonContent.web;

    return {
      clientId: installed.client_id,
      clientSecret: installed.client_secret,
    };
  }

  const clientId = await prompt('Enter Client ID: ');
  const clientSecret = await prompt('Enter Client Secret: ');

  return { clientId, clientSecret };
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

async function getRefreshToken(config: OAuth2Config): Promise<string> {
  console.log('\n🔗 Authorization Flow\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('\nOpen this URL in your browser:\n');
  console.log(generateAuthUrl(config));
  console.log('\n1. Log in with your Gmail account');
  console.log('2. Click "Continue" (ignore "unverified app" warning if shown)');
  console.log('3. Click "Allow"');
  console.log('4. Copy the authorization code\n');

  const authCode = await prompt('Paste authorization code here: ');

  console.log('\n🔄 Exchanging code for tokens...');
  const tokens = await exchangeCodeForTokens(config, authCode);

  if (!tokens.refresh_token) {
    console.log('\n❌ No refresh token received.');
    console.log('This usually means you already authorized this app.');
    console.log('\nTo fix:');
    console.log('1. Go to: https://myaccount.google.com/permissions');
    console.log('2. Find and remove "Secretario Gmail Access"');
    console.log('3. Run this script again\n');
    throw new Error('No refresh token received');
  }

  return tokens.refresh_token;
}

async function saveToDevVars(config: OAuth2Config, refreshToken: string): Promise<void> {
  const projectRoot = path.join(__dirname, '..');
  const devVarsPath = path.join(projectRoot, '.dev.vars');

  const content = `# Google OAuth2 for Gmail API
GOOGLE_CLIENT_ID=${config.clientId}
GOOGLE_CLIENT_SECRET=${config.clientSecret}
GOOGLE_REFRESH_TOKEN=${refreshToken}

# Telegram Bot (add these later)
# TELEGRAM_BOT_TOKEN=
# TELEGRAM_CHAT_ID=

# DeepSeek AI (add this later)
# DEEPSEEK_API_KEY=
`;

  fs.writeFileSync(devVarsPath, content);
  console.log(`\n✓ Credentials saved to .dev.vars`);
}

async function main() {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║   Gmail OAuth2 Setup - Using Existing Project            ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  try {
    // Step 1: Authenticate
    const account = await checkGcloudAuth();
    console.log(`\n✓ Authenticated as: ${account}`);

    // Step 2: Select project
    const projectId = await selectProject();
    console.log(`\n✓ Using project: ${projectId}`);

    // Step 3: Enable APIs
    await enableApis(projectId);

    // Step 4: Get OAuth2 credentials
    const config = await getOAuth2Credentials(projectId, account);
    console.log('\n✓ OAuth2 credentials configured');

    // Step 5: Get refresh token
    const refreshToken = await getRefreshToken(config);
    console.log('\n✓ Refresh token obtained');

    // Step 6: Save to .dev.vars
    await saveToDevVars(config, refreshToken);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✨ Setup complete!\n');
    console.log('Next steps:');
    console.log('  1. Test locally: bun run dev');
    console.log('  2. In another terminal: curl http://localhost:8787/trigger');
    console.log('  3. Check logs for email subjects');
    console.log('  4. Deploy: bun run deploy\n');
    console.log('For production, add secrets with:');
    console.log('  wrangler secret put GOOGLE_CLIENT_ID');
    console.log('  wrangler secret put GOOGLE_CLIENT_SECRET');
    console.log('  wrangler secret put GOOGLE_REFRESH_TOKEN\n');
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
