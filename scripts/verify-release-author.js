#!/usr/bin/env node
/**
 * Verify the latest GitHub release is published under uwu6967 (not cursor[bot]).
 * Run locally after: gh auth login  (as uwu6967)
 * In CI/automation this may warn when only cursor[bot] credentials are available.
 */
const { execFileSync } = require('child_process');
const pkg = require('../package.json');
const version = pkg.version;
const tag = `v${version}`;

function runGh(args) {
	return execFileSync('gh', args, { encoding: 'utf8' }).trim();
}

function main() {
	let author;

	try {
		author = runGh(['release', 'view', tag, '--json', 'author', '--jq', '.author.login']);
	} catch (err) {
		console.error(`FAIL: could not read GitHub release ${tag}`);
		console.error(err.stderr || err.message || err);
		process.exit(1);
	}

	if (author === 'uwu6967') {
		console.log(`OK: release ${tag} is published by uwu6967`);
		return;
	}

	console.error(`WARN: release ${tag} is published by ${author}, expected uwu6967`);
	console.error('Re-publish under your account:');
	console.error('  gh auth login   # as uwu6967');
	console.error('  ./scripts/restore-github-releases.sh');
	process.exit(author === 'cursor[bot]' ? 1 : 2);
}

main();
