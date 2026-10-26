/**
 * Sync selected repo-root Markdown into Starlight content (gitignored).
 * Add entries to PAGES below; predev / prebuild run this script.
 *
 * Edit only the `from` sources. Never hand-edit generated `to` files.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const docsRoot = join(here, '..');
const repoRoot = join(docsRoot, '../..');

const GITHUB_BLOB =
	'https://github.com/diaphana-io/2026bdbv-dashboard/blob/main';

/**
 * @typedef {object} SyncPage
 * @property {string} from Path relative to repo root (canonical source).
 * @property {string} to Path relative to apps/docs (Starlight content file).
 * @property {string} title Starlight frontmatter title.
 * @property {string} description Starlight frontmatter description.
 * @property {boolean} [stripLeadingH1=true] Drop the first ATX H1 (Starlight uses title).
 * @property {RegExp[]} [omitBodyPatterns] Extra body lines/blocks to remove before emit.
 */

/** @type {SyncPage[]} */
const PAGES = [
	{
		from: 'CONTRIBUTING.md',
		to: 'src/content/docs/contributing.md',
		title: 'Contributing',
		description:
			'How to clone, branch, open PRs, and track work for the 2026 BDBV dashboard.',
		omitBodyPatterns: [
			// Repo-only pointer to the published docs URL.
			/^Browsable copy on the public docs site:[^\n]*\r?\n(?:Edit \*\*this file\*\*[^\n]*\r?\n)?\r?\n?/m,
		],
	},
];

const GITIGNORE_START = '# >>> sync-repo-docs (managed — do not edit by hand)';
const GITIGNORE_END = '# <<< sync-repo-docs';

/**
 * Point clone-oriented relative links at GitHub when rendered on the site.
 * @param {string} body
 */
function rewriteRepoLinks(body) {
	return body
		.replace(
			/\]\((docs\/[^)#\s]+)(#[^)]*)?\)/g,
			(_, path, hash = '') => `](${GITHUB_BLOB}/${path}${hash})`,
		)
		.replace(
			/\]\(\.github\/([^)#\s]+)(#[^)]*)?\)/g,
			(_, path, hash = '') => `](${GITHUB_BLOB}/.github/${path}${hash})`,
		)
		.replace(
			/\]\(README\.md(#[^)]*)?\)/g,
			(_, hash = '') => `](${GITHUB_BLOB}/README.md${hash})`,
		);
}

/**
 * @param {SyncPage} page
 */
function syncPage(page) {
	const srcPath = join(repoRoot, page.from);
	const destPath = join(docsRoot, page.to);
	const stripH1 = page.stripLeadingH1 !== false;

	let body = readFileSync(srcPath, 'utf8');
	if (stripH1) {
		body = body.replace(/^#\s+[^\r\n]+\r?\n+/, '');
	}
	for (const pattern of page.omitBodyPatterns ?? []) {
		body = body.replace(pattern, '');
	}
	body = rewriteRepoLinks(body);

	const out = `---
title: ${JSON.stringify(page.title)}
description: ${JSON.stringify(page.description)}
---

:::note
Canonical source: [\`${page.from}\`](${GITHUB_BLOB}/${page.from}) at the repository root. This page is generated for the docs site.
:::

${body.trim()}
`;

	mkdirSync(dirname(destPath), { recursive: true });
	writeFileSync(destPath, out);
	console.log(
		`Synced ${relative(docsRoot, destPath).replace(/\\/g, '/')} ← ${page.from}`,
	);
}

/**
 * Keep apps/docs/.gitignore in sync with PAGES `to` paths.
 */
function updateGitignore() {
	const gitignorePath = join(docsRoot, '.gitignore');
	let text = readFileSync(gitignorePath, 'utf8');
	const block = [
		GITIGNORE_START,
		...PAGES.map((p) => p.to.replace(/\\/g, '/')),
		GITIGNORE_END,
	].join('\n');

	const start = text.indexOf(GITIGNORE_START);
	const end = text.indexOf(GITIGNORE_END);
	if (start !== -1 && end !== -1 && end > start) {
		text =
			text.slice(0, start) +
			block +
			text.slice(end + GITIGNORE_END.length).replace(/^\r?\n/, '');
	} else {
		text = `${text.trimEnd()}\n\n${block}\n`;
	}
	writeFileSync(gitignorePath, text.endsWith('\n') ? text : `${text}\n`);
}

for (const page of PAGES) {
	syncPage(page);
}
updateGitignore();
