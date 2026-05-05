#!/usr/bin/env bun
/**
 * Generate CHANGELOG entry using DeepSeek AI
 *
 * This script:
 * 1. Gets commits since the previous tag (or all commits if --initial)
 * 2. Calls DeepSeek API to generate a formatted changelog entry
 * 3. Prepends the entry to CHANGELOG.md
 * 4. Outputs the entry to stdout (for GitHub Release)
 *
 * Usage:
 *   bun run scripts/generate-changelog.ts --version 0.2.0 --previous-tag v0.1.0
 *   bun run scripts/generate-changelog.ts --version 0.1.0 --initial
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface Args {
	version: string;
	previousTag?: string;
	initial: boolean;
}

interface Commit {
	hash: string;
	subject: string;
	body: string;
	author: string;
	date: string;
}

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

const SYSTEM_PROMPT = `You are a changelog entry generator. Given a list of git commits, generate a well-structured changelog entry in Markdown following the Keep a Changelog format.

Classify changes into these categories (only include categories that have changes):
- **Added** - New features
- **Changed** - Changes in existing functionality
- **Fixed** - Bug fixes
- **Removed** - Removed features
- **Documentation** - Documentation changes
- **Internal** - Internal changes (refactoring, cleanup, tooling)

Rules:
1. Use concise, user-facing language
2. Group related commits together
3. Omit internal commits like "chore: release vX.Y.Z" or trivial formatting changes
4. Each bullet point should start with a capital letter and NOT end with a period
5. Use present tense ("Add feature" not "Added feature")
6. Be specific and actionable

Output ONLY the changelog entry content (the categories and bullets), NOT the version header.`;

function parseArgs(): Args {
	const args = process.argv.slice(2);
	const result: Args = {
		version: '',
		initial: false,
	};

	for (let i = 0; i < args.length; i++) {
		if (args[i] === '--version' && args[i + 1]) {
			result.version = args[i + 1];
			i++;
		} else if (args[i] === '--previous-tag' && args[i + 1]) {
			result.previousTag = args[i + 1];
			i++;
		} else if (args[i] === '--initial') {
			result.initial = true;
		}
	}

	if (!result.version) {
		console.error('Error: --version is required');
		process.exit(1);
	}

	return result;
}

function getCommits(previousTag?: string): Commit[] {
	const range = previousTag ? `${previousTag}..HEAD` : 'HEAD';
	const format = '%H%n%s%n%b%n%an%n%ad%n---END---';

	try {
		const output = execSync(`git log ${range} --date=short --format="${format}"`, {
			encoding: 'utf8',
			cwd: resolve(__dirname, '..'),
		});

		const commits: Commit[] = [];
		const blocks = output.split('---END---\n').filter(Boolean);

		for (const block of blocks) {
			const lines = block.trim().split('\n');
			if (lines.length < 5) continue;

			const [hash, subject, ...rest] = lines;
			// Body is everything except the last 2 lines (author and date)
			const body = rest.slice(0, -2).join('\n').trim();
			const author = rest[rest.length - 2];
			const date = rest[rest.length - 1];

			// Skip release commits
			if (subject.startsWith('chore: release v')) continue;

			commits.push({ hash, subject, body, author, date });
		}

		return commits;
	} catch (error) {
		console.error('Error getting commits:', error);
		return [];
	}
}

async function generateChangelogEntry(commits: Commit[], version: string): Promise<string> {
	const apiKey = process.env.DEEPSEEK_API_KEY;
	if (!apiKey) {
		throw new Error('DEEPSEEK_API_KEY environment variable is not set');
	}

	// Format commits for the prompt
	const commitsText = commits
		.map((c) => {
			const body = c.body ? `\n${c.body}` : '';
			return `- ${c.subject}${body}`;
		})
		.join('\n');

	const userPrompt = `Generate a changelog entry for version ${version} based on these commits:

${commitsText}

Output ONLY the categorized changes in Markdown (the bullet points under each category heading). Do NOT include the version number or date header.`;

	try {
		const response = await fetch(DEEPSEEK_API_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify({
				model: 'deepseek-chat',
				messages: [
					{ role: 'system', content: SYSTEM_PROMPT },
					{ role: 'user', content: userPrompt },
				],
				temperature: 0.7,
				max_tokens: 1000,
			}),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`DeepSeek API error: ${error}`);
		}

		const data = await response.json();
		const content = data.choices[0]?.message?.content;

		if (!content) {
			throw new Error('No content returned from DeepSeek API');
		}

		return content.trim();
	} catch (error) {
		console.error('Error calling DeepSeek API:', error);
		throw error;
	}
}

function updateChangelog(version: string, entry: string): void {
	const changelogPath = resolve(__dirname, '../CHANGELOG.md');
	const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

	const newEntry = `## [${version}] - ${date}

${entry}

`;

	let content: string;
	try {
		content = readFileSync(changelogPath, 'utf8');
	} catch {
		// CHANGELOG.md doesn't exist, create it
		content = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

`;
	}

	// Find the position to insert (after the header, before the first ## entry)
	const lines = content.split('\n');
	let insertIndex = lines.findIndex((line) => line.startsWith('## ['));

	if (insertIndex === -1) {
		// No existing entries, append at the end
		insertIndex = lines.length;
	}

	lines.splice(insertIndex, 0, newEntry);
	writeFileSync(changelogPath, lines.join('\n'));
}

async function main() {
	const args = parseArgs();

	console.error(`Generating changelog for v${args.version}...`);

	// Get commits
	const commits = getCommits(args.previousTag);
	console.error(`Found ${commits.length} commits`);

	if (commits.length === 0) {
		console.error('No commits found. Nothing to do.');
		process.exit(0);
	}

	// Generate changelog entry with DeepSeek
	const entry = await generateChangelogEntry(commits, args.version);

	// Update CHANGELOG.md
	updateChangelog(args.version, entry);
	console.error('CHANGELOG.md updated');

	// Output the entry to stdout (for GitHub Release body)
	const date = new Date().toISOString().split('T')[0];
	console.log(`## [${args.version}] - ${date}\n\n${entry}`);
}

main().catch((error) => {
	console.error('Fatal error:', error);
	process.exit(1);
});
