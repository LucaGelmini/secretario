#!/usr/bin/env bun

/**
 * Gmail OAuth2 Setup Script
 *
 * This script helps you obtain a refresh token for Gmail API access.
 * You only need to run this ONCE. The refresh token never expires
 * (unless you revoke it manually).
 *
 * Usage:
 *   bun run scripts/setup-gmail-oauth.ts
 */

import * as readline from 'node:readline';

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob'; // For console apps

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

/**
 * Prompt user for input
 */
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

/**
 * Step 1: Get OAuth2 credentials from user
 */
async function getCredentials(): Promise<OAuth2Config> {
  console.log('\n📋 Step 1: OAuth2 Credentials');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('\nYou need to create OAuth2 credentials in Google Cloud Console first.');
  console.log('\nInstructions:');
  console.log('1. Go to: https://console.cloud.google.com/apis/credentials');
  console.log('2. Click "Create Credentials" > "OAuth client ID"');
  console.log('3. Application type: "Desktop app"');
  console.log('4. Name: "Secretario Gmail Access"');
  console.log('5. Click "Create"');
  console.log('6. Copy the Client ID and Client Secret\n');

  const clientId = await prompt('Enter your Client ID: ');
  const clientSecret = await prompt('Enter your Client Secret: ');

  return { clientId, clientSecret };
}

/**
 * Step 2: Generate authorization URL
 */
function generateAuthUrl(config: OAuth2Config): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline', // Request refresh token
    prompt: 'consent', // Force consent screen to get refresh token
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Step 3: Exchange authorization code for tokens
 */
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
 * Main setup flow
 */
async function main() {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║   Gmail OAuth2 Setup - Secretario                         ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  try {
    // Step 1: Get credentials
    const config = await getCredentials();

    // Step 2: Generate auth URL
    console.log('\n🔗 Step 2: Authorize the Application');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('\nOpen this URL in your browser:\n');
    console.log(generateAuthUrl(config));
    console.log('\n1. Log in with your Gmail account');
    console.log('2. Click "Allow" to grant access');
    console.log('3. Copy the authorization code shown\n');

    const authCode = await prompt('Enter the authorization code: ');

    // Step 3: Exchange code for tokens
    console.log('\n🔄 Exchanging code for tokens...\n');
    const tokens = await exchangeCodeForTokens(config, authCode);

    if (!tokens.refresh_token) {
      console.error('\n❌ Error: No refresh token received. This usually means:');
      console.error('   - You already authorized this app before');
      console.error('   - Go to https://myaccount.google.com/permissions');
      console.error('   - Remove "Secretario Gmail Access" and try again\n');
      process.exit(1);
    }

    // Step 4: Display results
    console.log('✅ Success! Here are your credentials:\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('\nAdd these to your .dev.vars file:\n');
    console.log(`GOOGLE_CLIENT_ID=${config.clientId}`);
    console.log(`GOOGLE_CLIENT_SECRET=${config.clientSecret}`);
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('\nFor production, add them as secrets:\n');
    console.log('  wrangler secret put GOOGLE_CLIENT_ID');
    console.log('  wrangler secret put GOOGLE_CLIENT_SECRET');
    console.log('  wrangler secret put GOOGLE_REFRESH_TOKEN');
    console.log('\n✨ Setup complete! You can now use the Gmail integration.\n');
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
