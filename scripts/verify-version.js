#!/usr/bin/env node
/**
 * Verify panel version is consistent across tracked files.
 * Run: node scripts/verify-version.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const pkg = require(path.join(ROOT, 'package.json'));
const version = pkg.version;

function assert(condition, message) {
	if (!condition) {
		console.error('FAIL:', message);
		process.exit(1);
	}
}

function read(file) {
	return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

assert(/^\d+\.\d+\.\d+$/.test(version), `package.json version must be semver: ${version}`);

const checks = [
	{
		file: 'package.json',
		test: (content) => content.includes(`"version": "${version}"`),
		label: 'package.json version field'
	},
	{
		file: 'package-lock.json',
		test: (content) => content.includes(`"version": "${version}"`),
		label: 'package-lock.json root version'
	},
	{
		file: 'README.md',
		test: (content) => content.includes(`**Current version:** ${version}`),
		label: 'README current version'
	},
	{
		file: 'README.md',
		test: (content) => content.includes(`/releases/tag/v${version}`),
		label: 'README latest release link'
	},
	{
		file: 'src/server/data/updateLogs.ts',
		test: (content) => {
			const match = content.match(/version:\s*'([^']+)'/);
			return match && match[1] === version;
		},
		label: 'updateLogs.ts first entry version'
	},
	{
		file: `scripts/release-notes/v${version}.md`,
		test: (content) => content.includes(`v${version}`),
		label: 'release notes file exists and references version'
	},
	{
		file: 'scripts/restore-github-releases.sh',
		test: (content) => content.includes(`[v${version}]=`) && content.includes(`v${version} -`),
		label: 'restore-github-releases.sh entry for current version'
	}
];

for (const check of checks) {
	const fullPath = path.join(ROOT, check.file);
	assert(fs.existsSync(fullPath), `missing file: ${check.file}`);
	assert(check.test(read(check.file)), check.label);
}

console.log(`OK: version ${version} is consistent across tracked files`);
