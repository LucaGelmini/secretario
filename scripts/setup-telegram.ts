#!/usr/bin/env bun
/**
 * Telegram Bot Setup Script
 *
 * This script helps you:
 * 1. Verify your bot token
 * 2. Get your chat ID
 * 3. Set the webhook URL
 *
 * Prerequisites:
 * - Create a bot with @BotFather on Telegram
 * - Get your bot token
 */

import { $ } from "bun";

const COLORS = {
	reset: "\x1b[0m",
	bold: "\x1b[1m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	red: "\x1b[31m",
};

function log(message: string, color = COLORS.reset) {
	console.log(`${color}${message}${COLORS.reset}`);
}

function header(text: string) {
	const border = "═".repeat(text.length + 4);
	log(`\n╔${border}╗`, COLORS.blue);
	log(`║  ${text}  ║`, COLORS.blue);
	log(`╚${border}╝\n`, COLORS.blue);
}

async function prompt(question: string): Promise<string> {
	process.stdout.write(`${COLORS.yellow}${question}${COLORS.reset} `);
	const input = await new Promise<string>((resolve) => {
		const stdin = process.stdin;
		stdin.setEncoding("utf8");
		stdin.once("data", (data) => {
			resolve(data.toString().trim());
		});
	});
	return input;
}

async function getBotInfo(token: string) {
	const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
	const data = await response.json();
	return data;
}

async function getUpdates(token: string) {
	const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
	const data = await response.json();
	return data;
}

async function setWebhook(token: string, url: string) {
	const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ url }),
	});
	const data = await response.json();
	return data;
}

async function getWebhookInfo(token: string) {
	const response = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
	const data = await response.json();
	return data;
}

async function main() {
	header("Telegram Bot Setup - Secretario");

	// Step 1: Get bot token
	log("Step 1: Verify Bot Token", COLORS.bold);
	log("Create a bot with @BotFather if you haven't already.\n");

	const token = await prompt("Enter your bot token:");
	if (!token) {
		log("❌ Bot token is required", COLORS.red);
		process.exit(1);
	}

	// Verify token
	log("\nVerifying bot token...");
	const botInfo = await getBotInfo(token);

	if (!botInfo.ok) {
		log(`❌ Invalid bot token: ${botInfo.description}`, COLORS.red);
		process.exit(1);
	}

	log(`✓ Bot verified: @${botInfo.result.username}`, COLORS.green);
	log(`  Name: ${botInfo.result.first_name}`, COLORS.green);
	log(`  ID: ${botInfo.result.id}`, COLORS.green);

	// Step 2: Get chat ID
	log("\n" + "─".repeat(60), COLORS.blue);
	log("Step 2: Get Your Chat ID", COLORS.bold);
	log(
		"Send a message to your bot on Telegram (e.g., /start), then press Enter here.\n",
	);

	await prompt("Press Enter when you've sent a message to the bot...");

	log("\nFetching updates...");
	const updates = await getUpdates(token);

	if (!updates.ok || !updates.result || updates.result.length === 0) {
		log("❌ No messages found. Make sure you sent a message to the bot.", COLORS.red);
		process.exit(1);
	}

	const latestMessage = updates.result[updates.result.length - 1];
	const chatId = latestMessage.message?.chat?.id;

	if (!chatId) {
		log("❌ Could not extract chat ID from message", COLORS.red);
		process.exit(1);
	}

	log(`✓ Chat ID found: ${chatId}`, COLORS.green);

	// Step 3: Set webhook (optional)
	log("\n" + "─".repeat(60), COLORS.blue);
	log("Step 3: Configure Webhook (Optional)", COLORS.bold);
	log(
		"If you want to use webhooks, provide your Worker URL.\nOtherwise, skip this step.\n",
	);

	const configureWebhook = await prompt("Configure webhook? (y/n):");

	let webhookUrl = "";

	if (configureWebhook.toLowerCase() === "y") {
		webhookUrl = await prompt("Enter your Worker URL (e.g., https://secretario.user.workers.dev):");

		if (webhookUrl) {
			const fullWebhookUrl = `${webhookUrl}/telegram/webhook`;
			log(`\nSetting webhook to: ${fullWebhookUrl}`);

			const webhookResult = await setWebhook(token, fullWebhookUrl);

			if (!webhookResult.ok) {
				log(`❌ Failed to set webhook: ${webhookResult.description}`, COLORS.red);
			} else {
				log("✓ Webhook set successfully", COLORS.green);
			}
		}
	}

	// Step 4: Save to .dev.vars
	log("\n" + "─".repeat(60), COLORS.blue);
	log("Step 4: Save Configuration", COLORS.bold);

	const saveConfig = await prompt("Save to .dev.vars? (y/n):");

	if (saveConfig.toLowerCase() === "y") {
		const devVarsPath = new URL("../.dev.vars", import.meta.url).pathname;

		// Read existing .dev.vars or create new
		let existingContent = "";
		try {
			existingContent = await Bun.file(devVarsPath).text();
		} catch {
			// File doesn't exist, will create new
		}

		// Update or append Telegram vars
		let newContent = existingContent;

		const telegramSection = `# Telegram Bot\nTELEGRAM_BOT_TOKEN=${token}\nTELEGRAM_CHAT_ID=${chatId}\n`;

		if (existingContent.includes("TELEGRAM_BOT_TOKEN")) {
			// Replace existing
			newContent = existingContent.replace(/# Telegram Bot[\s\S]*?(?=\n#|$)/m, telegramSection);
		} else {
			// Append
			newContent = existingContent.trim() + "\n\n" + telegramSection;
		}

		await Bun.write(devVarsPath, newContent);

		log(`✓ Saved to ${devVarsPath}`, COLORS.green);
	}

	// Summary
	log("\n" + "═".repeat(60), COLORS.blue);
	log("✨ Setup Complete!", COLORS.bold + COLORS.green);
	log("\nNext steps:", COLORS.bold);
	log("  1. Test locally: bun run dev");
	log("  2. Send /digest command to your bot");
	log("  3. Deploy: bun run deploy");

	if (webhookUrl) {
		log(`  4. Set webhook in production: wrangler secret put TELEGRAM_BOT_TOKEN`);
		log(`  5. Set chat ID in production: wrangler secret put TELEGRAM_CHAT_ID`);
	}

	log("\n" + "═".repeat(60) + "\n", COLORS.blue);
}

main().catch((error) => {
	log(`❌ Error: ${error.message}`, COLORS.red);
	process.exit(1);
});
