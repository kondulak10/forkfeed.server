#!/usr/bin/env node

import { mkdir, writeFile, readdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join, basename } from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import QRCode from 'qrcode';
import { GUIDE_CONTENT } from './guide-content.js';
import { IMAGE_CATALOG, resolveImageId } from './image-catalog.js';

const execFileAsync = promisify(execFile);

const APP_SERVER_URL = (
  process.env.APP_SERVER_URL || 'https://api.forkfeed.link'
).replace(/\/+$/, '');
const TOKEN = process.env.FORKFEED_TOKEN || '';

// ── Content schemas (validate generated cards before writing) ──────────

const sizingEnum = z.enum(['automatic', 'wide', 'portrait', 'square', 'small_portrait']);
const socialSourceEnum = z.enum(['x', 'linkedin', 'instagram', 'facebook', 'threads', 'bluesky']);
const buttonActionEnum = z.enum(['url', 'fork', 'feed', 'user']);

const quizOptionSchema = z.object({
  label: z.string().min(1),
  correct: z.boolean(),
}).passthrough();

const contentBlockSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('CONTENT_IMAGE'), imageSrc: z.string().min(1), sizing: sizingEnum }).passthrough(),
  z.object({ type: z.literal('CONTENT_TITLE'), title: z.string().min(1) }).passthrough(),
  z.object({ type: z.literal('CONTENT_TEXT'), text: z.string().min(1) }).passthrough(),
  z.object({ type: z.literal('CONTENT_CODE'), code: z.string().min(1), language: z.string().optional() }).passthrough(),
  z.object({ type: z.literal('CONTENT_SOCIAL'), name: z.string().min(1), subtitle: z.string().optional(), avatarSrc: z.string(), source: socialSourceEnum }).passthrough(),
  z.object({ type: z.literal('CONTENT_SUBTEXT'), text: z.string().min(1) }).passthrough(),
  z.object({ type: z.literal('CONTENT_QUIZ'), question: z.string().min(1), options: z.array(quizOptionSchema).min(2), explanation: z.string().optional() }).passthrough(),
  z.object({ type: z.literal('CONTENT_BUTTON'), label: z.string().min(1), action: buttonActionEnum, target: z.string().min(1) }).passthrough(),
]);

const variantSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('FULL_IMAGE'), imageSrc: z.string().min(1, 'FULL_IMAGE requires imageSrc'), title: z.string().optional(), subtitle: z.string().max(200, 'FULL_IMAGE subtitle max 200 chars').optional() }).passthrough(),
  z.object({ type: z.literal('CONTENT'), blocks: z.array(contentBlockSchema).min(1, 'CONTENT variant needs at least one block'), backgroundSrc: z.string().optional() }).passthrough(),
]);

type Variant = z.infer<typeof variantSchema>;

interface BuiltCard { id: string; variants: Variant[] }
interface BuiltFeed {
  id: string;
  title: string;
  description: string;
  imageSrc: string;
  mode: 'sequential';
  scrollDirection: 'vertical';
  engagement: true;
  cards: BuiltCard[];
}
interface ForkMeta {
  id: string;
  title: string;
  description: string;
  imageSrc: string;
  actionLabel?: string;
  actionUrl?: string;
}

/** Validate a built card's variants. Returns an error string or null. */
function validateCards(cards: BuiltCard[]): string | null {
  const errors: string[] = [];
  cards.forEach((card, ci) => {
    if (card.variants.length < 2) errors.push(`card[${ci}] needs at least 2 variants (cover + detail)`);
    card.variants.forEach((v, vi) => {
      const parsed = variantSchema.safeParse(v);
      if (!parsed.success) {
        errors.push(`card[${ci}].variants[${vi}]: ${parsed.error.issues.map((i) => i.message).join(', ')}`);
      }
      if (v.type === 'CONTENT') {
        for (const block of v.blocks) {
          if (block.type === 'CONTENT_QUIZ' && !block.options.some((o) => o.correct === true)) {
            errors.push(`card[${ci}].variants[${vi}]: CONTENT_QUIZ must have at least one correct option`);
          }
        }
      }
    });
  });
  return errors.length > 0 ? errors.join('\n') : null;
}

// ── Helpers ────────────────────────────────────────────────────────────

function authHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${TOKEN}`,
  };
}

// ── Git helpers ───────────────────────────────────────────────────────

async function gitExec(args: string[], cwd: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync('git', args, {
      cwd,
      maxBuffer: 5 * 1024 * 1024,
      timeout: 15_000,
    });
    return stdout;
  } catch (err: unknown) {
    const e = err as { code?: string; killed?: boolean; stderr?: string; message?: string };
    if (e.code === 'ENOENT') throw new Error('git command not found. Ensure git is installed and in PATH.');
    if (e.killed) throw new Error('git command timed out after 15s.');
    throw new Error(e.stderr?.trim() || e.message || 'git command failed');
  }
}

async function isGitRepo(cwd: string): Promise<boolean> {
  try {
    await gitExec(['rev-parse', '--is-inside-work-tree'], cwd);
    return true;
  } catch {
    return false;
  }
}

async function getRepoInfo(cwd: string): Promise<{ owner: string | null; repo: string; isLocal: boolean }> {
  try {
    const url = (await gitExec(['remote', 'get-url', 'origin'], cwd)).trim();
    const m = url.match(/github\.com[/:]([^/]+)\/([^/.]+)/);
    if (m) return { owner: m[1], repo: m[2], isLocal: false };
  } catch { /* no remote */ }
  return { owner: null, repo: basename(cwd), isLocal: true };
}

interface CommitEntry {
  sha: string;
  shortSha: string;
  message: string;
  author: string;
  date: string;
}

const SEP = '\x1e'; // ASCII record separator (safe in commit messages)

async function getCommitList(cwd: string, count = 15): Promise<CommitEntry[]> {
  const fmt = `%H${SEP}%h${SEP}%s${SEP}%an${SEP}%aI`;
  const raw = await gitExec(['log', '--no-merges', `-${count}`, `--format=${fmt}`], cwd);
  return raw.trim().split('\n').filter(Boolean).map((line) => {
    const [sha, shortSha, message, author, date] = line.split(SEP);
    return { sha, shortSha, message, author, date: date?.slice(0, 10) || '' };
  });
}

function truncateDiff(diff: string, maxLinesPerFile = 200): string {
  const fileDiffs = diff.split(/^(?=diff --git )/m);
  return fileDiffs.map((fd) => {
    if (/^Binary files/.test(fd) || fd.includes('Binary files')) {
      const path = fd.match(/diff --git a\/(.+?) b\//)?.[1] || 'unknown';
      return `Binary file: ${path} (skipped)`;
    }
    const lines = fd.split('\n');
    if (lines.length <= maxLinesPerFile) return fd;
    return lines.slice(0, maxLinesPerFile).join('\n') + `\n... [truncated, ${lines.length - maxLinesPerFile} more lines]`;
  }).join('\n');
}

interface CommitDetail {
  sha: string;
  shortSha: string;
  message: string;
  author: string;
  date: string;
  stats: string;
  diff: string;
}

async function getCommitDetail(cwd: string, sha: string): Promise<CommitDetail> {
  const [meta, stats, diff] = await Promise.all([
    gitExec(['show', sha, `--format=%H${SEP}%h${SEP}%s${SEP}%an${SEP}%aI`, '--no-patch'], cwd),
    gitExec(['diff', `${sha}^..${sha}`, '--stat'], cwd),
    gitExec(['diff', `${sha}^..${sha}`, '-U3'], cwd),
  ]);

  const [fullSha, shortSha, message, author, date] = meta.trim().split(SEP);
  return {
    sha: fullSha,
    shortSha,
    message,
    author,
    date: date?.slice(0, 10) || '',
    stats: stats.trim(),
    diff: truncateDiff(diff),
  };
}

const TAG_KEYWORDS: Record<string, string[]> = {
  debug: ['fix', 'bug', 'patch', 'hotfix', 'error', 'crash', 'test', 'spec'],
  deploy: ['deploy', 'release', 'ci', 'cd', 'docker', 'build', 'publish', 'pipeline'],
  disaster: ['break', 'crash', 'fail', 'revert', 'rollback', 'incident', 'down'],
  git: ['merge', 'conflict', 'branch', 'rebase', 'cherry-pick'],
  hype: ['feat', 'feature', 'add', 'new', 'launch', 'ship', 'initial'],
  victory: ['complete', 'finish', 'done', 'success', 'milestone'],
  language: ['typescript', 'javascript', 'python', 'rust', 'go', 'java'],
  general: ['refactor', 'clean', 'update', 'chore', 'docs', 'style'],
  sarcastic: ['hack', 'workaround', 'todo', 'fixme', 'wtf'],
  workplace: ['meeting', 'standup', 'review', 'sprint'],
  lifestyle: ['config', 'setup', 'env', 'tooling'],
};

const PATH_TAGS: [RegExp, string][] = [
  [/\.(test|spec)\.[jt]sx?$/, 'debug'],
  [/\.github\/workflows|Dockerfile|docker|\.ci|Jenkinsfile/, 'deploy'],
  [/\.env|config/, 'lifestyle'],
];

function detectTags(message: string, filePaths: string[]): string[] {
  const tags = new Set<string>();
  const lower = message.toLowerCase();

  for (const [tag, keywords] of Object.entries(TAG_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) tags.add(tag);
  }

  for (const fp of filePaths) {
    for (const [re, tag] of PATH_TAGS) {
      if (re.test(fp)) tags.add(tag);
    }
  }

  if (tags.size === 0) tags.add('general');
  return [...tags];
}

function parseFilePathsFromStats(stats: string): string[] {
  const matches = stats.match(/^\s*(.+?)\s+\|/gm) || [];
  return matches.map((m) => m.trim().replace(/\s+\|$/, ''));
}

const BG_PREFS: string[][] = [
  ['bg10', 'bg27'],                       // 0: ELI5
  ['bg11', 'bg1'],                        // 1: Roast
  ['bg25', 'bg24'],                       // 2: LinkedIn
  ['bg12', 'bg13', 'bg14', 'bg15', 'bg17'], // 3: Learning (tech-match)
  ['bg25', 'bg30'],                       // 4: Alternatives
  ['bg18', 'bg5'],                        // 5: Quiz
];

// Map language tags to preferred Learning card (index 3) backgrounds
const LANG_BG: Record<string, string> = {
  javascript: 'bg12', typescript: 'bg12',
  python: 'bg13',
  rust: 'bg14',
  deploy: 'bg15',
};

function assignBackgrounds(tags: string[]): string[] {
  const used = new Set<string>();

  const learningPrefs = [...BG_PREFS[3]];
  for (const tag of tags) {
    const preferred = LANG_BG[tag];
    if (preferred && learningPrefs.includes(preferred)) {
      learningPrefs.splice(learningPrefs.indexOf(preferred), 1);
      learningPrefs.unshift(preferred);
      break;
    }
  }

  return BG_PREFS.map((prefs, i) => {
    const candidates = i === 3 ? learningPrefs : prefs;
    const pick = candidates.find((bg) => !used.has(bg)) || candidates[0];
    used.add(pick);
    return pick;
  });
}

function filterImagesByTags(tags: string[]): { scenes: string[]; backgrounds: string[] } {
  const tagSet = new Set(tags);

  function score(entry: { tags: string }): number {
    return entry.tags.split(',').map((t) => t.trim()).filter((t) => tagSet.has(t)).length;
  }

  const scenes = IMAGE_CATALOG
    .filter((i) => i.id.startsWith('img'))
    .map((i) => ({ ...i, score: score(i) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 30)
    .map((i) => `${i.id} | ${i.name} | ${i.tags}`);

  const backgrounds = IMAGE_CATALOG
    .filter((i) => i.id.startsWith('bg'))
    .map((i) => ({ ...i, score: score(i) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((i) => `${i.id} | ${i.name} | ${i.tags}`);

  return { scenes, backgrounds };
}

// ── Status helper ─────────────────────────────────────────────────────

interface StatusFork { title: string; externalForkId: string; visibility: string; feeds: number }
interface StatusFeed { externalFeedId: string; title: string; cardCount?: number }
interface StatusData { forks: StatusFork[]; feeds: StatusFeed[] }

async function fetchStatusData(): Promise<StatusData> {
  const res = await fetch(`${APP_SERVER_URL}/api/content/status`, {
    headers: authHeaders(),
    signal: AbortSignal.timeout(10_000),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Status check failed (${res.status}): ${data.error || JSON.stringify(data)}`);
  return data as StatusData;
}

// ── Cover titles (fixed per card index) ──────────────────────────────

const COVERS = [
  { title: "🧒 Explain Like I'm 5", subtitle: "Hopefully now you'll understand what you pushed" },
  { title: "🔥 The Roast", subtitle: "Your code had it coming" },
  { title: "💼 The LinkedIn Post", subtitle: "Mass cringe, freshly generated" },
  { title: "💡 Learning Moment", subtitle: "Something useful buried in your chaos" },
  { title: "🔀 Alternatives", subtitle: "What you could have done instead" },
  { title: "🧠 Quiz", subtitle: "Let's see if you even understand your own code" },
];

// ── Simplified block inference ───────────────────────────────────────

function inferBlock(block: Record<string, unknown>): z.infer<typeof contentBlockSchema> {
  if ('question' in block) {
    return {
      type: 'CONTENT_QUIZ' as const,
      question: block.question as string,
      options: block.options as { label: string; correct: boolean }[],
      ...(block.explanation != null ? { explanation: block.explanation as string } : {}),
    };
  }
  if ('name' in block && 'avatar' in block) {
    const avatar = block.avatar as string;
    return {
      type: 'CONTENT_SOCIAL' as const,
      name: block.name as string,
      avatarSrc: avatar.startsWith('http') ? avatar : resolveImageId(avatar),
      source: block.source as 'x' | 'linkedin' | 'instagram' | 'facebook' | 'threads' | 'bluesky',
      ...(block.subtitle != null ? { subtitle: block.subtitle as string } : {}),
    };
  }
  if ('label' in block && 'action' in block && 'target' in block) {
    return {
      type: 'CONTENT_BUTTON' as const,
      label: block.label as string,
      action: block.action as 'url' | 'fork' | 'feed' | 'user',
      target: block.target as string,
    };
  }
  if ('img' in block) {
    const img = block.img as string;
    return {
      type: 'CONTENT_IMAGE' as const,
      imageSrc: img.startsWith('http') ? img : resolveImageId(img),
      sizing: (block.sizing as string || 'wide') as 'automatic' | 'wide' | 'portrait' | 'square' | 'small_portrait',
    };
  }
  if ('code' in block) {
    return {
      type: 'CONTENT_CODE' as const,
      code: block.code as string,
      ...(block.lang != null ? { language: block.lang as string } : {}),
    };
  }
  if ('subtext' in block) {
    return { type: 'CONTENT_SUBTEXT' as const, text: block.subtext as string };
  }
  if ('title' in block) {
    return { type: 'CONTENT_TITLE' as const, title: block.title as string };
  }
  if ('text' in block) {
    return { type: 'CONTENT_TEXT' as const, text: block.text as string };
  }
  throw new Error(`Cannot infer block type from fields: ${Object.keys(block).join(', ')}`);
}

// ── Build input schema ───────────────────────────────────────────────

const buildInputSchema = z.object({
  sha: z.string().min(1),
  feedTitle: z.string().min(1).max(60),
  feedDescription: z.string().min(1),
  forkTitle: z.string().min(1),
  forkDescription: z.string().min(1),
  cards: z.array(z.object({
    variants: z.array(z.object({
      blocks: z.array(z.record(z.string(), z.unknown())).min(1),
    })).min(1),
  })).length(6),
  cwd: z.string().optional().describe('Working directory for git (defaults to process.cwd())'),
  outDir: z.string().optional().describe('Forkserver repo root to write forks/ into (defaults to cwd)'),
  bgOverride: z.array(z.string()).length(6).optional().describe('Override auto-assigned background IDs'),
  coverOverride: z.array(z.string()).length(6).optional().describe('Override cover image IDs (defaults to backgrounds)'),
});

type BuildInput = z.infer<typeof buildInputSchema>;

// ── Content builder ──────────────────────────────────────────────────

async function buildFeed(input: BuildInput): Promise<{ forkId: string; feed: BuiltFeed; forkMeta: ForkMeta }> {
  const cwd = input.cwd || process.cwd();

  const repoInfo = await getRepoInfo(cwd);
  const owner = repoInfo.owner || 'local';
  const repo = repoInfo.repo;
  const sha7 = input.sha.slice(0, 7);

  const forkId = `tfip-${owner}-${repo}`;
  const feedId = `tfip-${owner}-${repo}-${sha7}`;

  // Auto-assign backgrounds (or use override)
  let bgs: string[];
  if (input.bgOverride) {
    bgs = input.bgOverride;
  } else {
    const meta = await gitExec(['show', input.sha, '--format=%s', '--no-patch'], cwd);
    const statOutput = await gitExec(['diff', `${input.sha}^..${input.sha}`, '--stat'], cwd);
    const filePaths = parseFilePathsFromStats(statOutput);
    const tags = detectTags(meta.trim(), filePaths);
    bgs = assignBackgrounds(tags);
  }

  const bgUrls = bgs.map(resolveImageId);
  const coverUrls = input.coverOverride ? input.coverOverride.map(resolveImageId) : bgUrls;

  const actionUrl = repoInfo.owner
    ? `https://github.com/${repoInfo.owner}/${repoInfo.repo}`
    : undefined;

  const forkMeta: ForkMeta = {
    id: forkId,
    title: input.forkTitle,
    description: input.forkDescription,
    imageSrc: coverUrls[0],
    ...(actionUrl ? { actionLabel: 'View on GitHub', actionUrl } : {}),
  };

  const cards: BuiltCard[] = input.cards.map((card, i) => {
    const coverVariant: Variant = {
      type: 'FULL_IMAGE',
      imageSrc: coverUrls[i],
      title: COVERS[i].title,
      subtitle: COVERS[i].subtitle,
    };
    const detailVariants: Variant[] = card.variants.map((v) => ({
      type: 'CONTENT',
      backgroundSrc: bgUrls[i],
      blocks: v.blocks.map((b) => inferBlock(b as Record<string, unknown>)),
    }));
    return { id: `${feedId}-card-${i}`, variants: [coverVariant, ...detailVariants] };
  });

  const feed: BuiltFeed = {
    id: feedId,
    title: input.feedTitle,
    description: input.feedDescription,
    imageSrc: coverUrls[0],
    mode: 'sequential',
    scrollDirection: 'vertical',
    engagement: true,
    cards,
  };

  return { forkId, feed, forkMeta };
}

// ── File scaffolding ─────────────────────────────────────────────────

function feedFileSource(feed: BuiltFeed): string {
  return `import type { StaticFeed } from '../../src/types.js';\n\n` +
    `const feed: StaticFeed = ${JSON.stringify(feed, null, 2)};\n\n` +
    `export default feed;\n`;
}

function forkFileSource(forkMeta: ForkMeta, feedIds: string[]): string {
  const imports = feedIds.map((id, i) => `import feed${i} from './${id}.js';`).join('\n');
  const feedList = feedIds.map((_, i) => `feed${i}`).join(', ');
  return `import type { Fork } from '../../src/types.js';\n${imports}\n\n` +
    `const fork: Fork = {\n  meta: ${JSON.stringify(forkMeta, null, 2).replace(/\n/g, '\n  ')},\n  feeds: [${feedList}],\n};\n\n` +
    `export default fork;\n`;
}

/**
 * Write the feed file and (re)generate fork.ts importing every feed file in the
 * fork directory. Returns the directory written to.
 */
async function writeForkFiles(outDir: string, forkId: string, feed: BuiltFeed, forkMeta: ForkMeta): Promise<string> {
  const dir = join(outDir, 'forks', forkId);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, `${feed.id}.ts`), feedFileSource(feed));

  // Collect every feed file in the dir (excludes fork.ts) so fork.ts imports them all.
  const entries = await readdir(dir);
  const feedIds = entries
    .filter((f) => f.endsWith('.ts') && f !== 'fork.ts')
    .map((f) => f.replace(/\.ts$/, ''))
    .sort();
  await writeFile(join(dir, 'fork.ts'), forkFileSource(forkMeta, feedIds));

  return dir;
}

// ── MCP result type ───────────────────────────────────────────────────

interface McpResult {
  [key: string]: unknown;
  content: { type: 'text'; text: string }[];
  isError?: boolean;
}

// ── MCP Server ─────────────────────────────────────────────────────────

const server = new McpServer({
  name: 'forkfeed',
  version: '2.0.0',
});

// ── Tool: forkfeed_guide ───────────────────────────────────────────────

server.tool(
  'forkfeed_guide',
  'Get the complete guide for generating forkfeed content from GitHub commits. Call this first to learn the card format before generating content.',
  {},
  async () => ({
    content: [{ type: 'text', text: GUIDE_CONTENT }],
  }),
);

// ── Tool: forkfeed_commits ─────────────────────────────────────────────

server.tool(
  'forkfeed_commits',
  'Read git commits from the current repo. Without sha: lists recent commits. With sha: returns structured commit details + pre-filtered images for content generation.',
  {
    sha: z.string().optional().describe('Full or short SHA to analyze in detail. Omit to list recent commits.'),
    cwd: z.string().optional().describe('Working directory. Defaults to process.cwd().'),
  },
  async ({ sha, cwd: inputCwd }) => {
    const cwd = inputCwd || process.cwd();

    if (!(await isGitRepo(cwd))) {
      return { content: [{ type: 'text' as const, text: 'Not in a git repo. Navigate to a git repository first.' }], isError: true };
    }

    const repoInfo = await getRepoInfo(cwd);
    const repoLabel = repoInfo.owner ? `${repoInfo.owner}/${repoInfo.repo}` : `local/${repoInfo.repo}`;

    // ── List mode ──
    if (!sha) {
      let commits: CommitEntry[];
      try {
        commits = await getCommitList(cwd);
      } catch (err) {
        return { content: [{ type: 'text' as const, text: `Failed to read git log: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
      }

      if (commits.length === 0) {
        return { content: [{ type: 'text' as const, text: 'No commits found in this repository.' }] };
      }

      const lines = [
        `Repo: ${repoLabel}`,
        '',
        '| # | SHA | Message | Author | Date |',
        '|---|-----|---------|--------|------|',
      ];

      for (let i = 0; i < commits.length; i++) {
        const c = commits[i];
        lines.push(`| ${i + 1} | ${c.shortSha} | ${c.message.slice(0, 60)} | ${c.author} | ${c.date} |`);
      }

      return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
    }

    // ── Detail mode ──
    let detail: CommitDetail;
    try {
      detail = await getCommitDetail(cwd, sha);
    } catch (err) {
      return { content: [{ type: 'text' as const, text: `Failed to read commit ${sha}: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
    }

    const filePaths = parseFilePathsFromStats(detail.stats);
    const tags = detectTags(detail.message, filePaths);
    const images = filterImagesByTags(tags);

    const lines = [
      `## Commit: ${detail.shortSha} - ${detail.message}`,
      `Author: ${detail.author} | Date: ${detail.date}`,
      `Repo: ${repoLabel}`,
      repoInfo.owner ? `GitHub: https://github.com/${repoInfo.owner}/${repoInfo.repo}` : '',
      '',
      '## File Stats',
      detail.stats,
      '',
      '## Diff',
      detail.diff,
      '',
      `## Suggested Scene Images (tags: ${tags.join(', ')})`,
      'Use short IDs (e.g. img47) in card blocks. Backgrounds are auto-assigned by the builder.',
      '',
      ...images.scenes,
    ].filter(Boolean);

    return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
  },
);

// ── Tool: forkfeed_build ──────────────────────────────────────────────

server.tool(
  'forkfeed_build',
  'Build forkfeed content from a commit and write it as typed TypeScript files into a forkserver repo (forks/<forkId>/). Auto-detects repo info and assigns backgrounds. After this, run `npm run convert && npm run deploy` in the forkserver repo, then forkfeed_publish.',
  {
    content: buildInputSchema.describe('Simplified content: sha, titles, descriptions, 6 cards with blocks, and optional outDir (forkserver repo root)'),
  },
  async ({ content }): Promise<McpResult> => {
    let forkId: string;
    let feed: BuiltFeed;
    let forkMeta: ForkMeta;
    try {
      ({ forkId, feed, forkMeta } = await buildFeed(content));
    } catch (err) {
      return { content: [{ type: 'text', text: `Build failed: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
    }

    const validationError = validateCards(feed.cards);
    if (validationError) {
      return { content: [{ type: 'text', text: `Content validation failed:\n${validationError}\n\nFix the issues above and try again.` }], isError: true };
    }

    const outDir = content.outDir || content.cwd || process.cwd();
    let dir: string;
    try {
      dir = await writeForkFiles(outDir, forkId, feed, forkMeta);
    } catch (err) {
      return { content: [{ type: 'text', text: `Failed to write files: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
    }

    return {
      content: [{
        type: 'text',
        text: [
          'Content written to your forkserver repo!',
          '',
          `Fork:  ${forkMeta.title}  (${forkId})`,
          `Feed:  ${feed.title}  (${feed.cards.length} cards)`,
          `Files: ${dir}/${feed.id}.ts`,
          `       ${dir}/fork.ts (regenerated)`,
          '',
          'Next steps (in the forkserver repo):',
          '  1. npm run convert   # regenerate forks/index.ts',
          '  2. npm run typecheck # validate the typed content',
          '  3. npm run deploy    # deploy the worker',
          `  4. Then register it with the app: forkfeed_publish forkId=${forkId} forkServerUrl=<your-worker-url>`,
        ].join('\n'),
      }],
    };
  },
);

// ── Tool: forkfeed_publish ────────────────────────────────────────────

server.tool(
  'forkfeed_publish',
  'Register a deployed fork with the forkfeed app. Fetches the fork metadata from your forkserver and stores it (as private). Run after the forkserver is deployed.',
  {
    forkId: z.string().min(1).describe('The fork id (e.g. tfip-owner-repo)'),
    forkServerUrl: z.string().min(1).describe('Base URL of your deployed forkserver worker'),
    readKey: z.string().optional().describe('Read key for the forkserver (defaults to "read")'),
  },
  async ({ forkId, forkServerUrl, readKey }): Promise<McpResult> => {
    if (!TOKEN) {
      return { content: [{ type: 'text', text: 'Error: FORKFEED_TOKEN not set. Get your API token from forkfeed.link/admin/user/token.' }], isError: true };
    }
    try {
      const res = await fetch(`${APP_SERVER_URL}/api/content/publish`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ forkServerUrl, forkId, readKey }),
        signal: AbortSignal.timeout(15_000),
      });
      const data = await res.json();
      if (!res.ok) {
        return { content: [{ type: 'text', text: `Publish failed (${res.status}): ${data.error || JSON.stringify(data)}` }], isError: true };
      }

      const realForkId = data.fork?.id || forkId;
      let qrBlock = '';
      try {
        const url = `https://forkfeed.link/fork/${realForkId}`;
        const qr = await QRCode.toString(url, { type: 'utf8', errorCorrectionLevel: 'L' });
        qrBlock = ['', 'Scan to open in forkfeed:', '', qr].join('\n');
      } catch { /* qr optional */ }

      const blocks: { type: 'text'; text: string }[] = [{
        type: 'text',
        text: [
          'Fork published!',
          '',
          `Fork:  ${data.fork?.title || forkId}`,
          `Feeds: ${data.feeds?.length ?? 0}`,
          `Visibility: ${data.fork?.visibility || 'private'}`,
          '',
          'Your content starts as private. To make it public, change visibility in the app (requires admin approval).',
        ].join('\n'),
      }];
      if (qrBlock) blocks.push({ type: 'text', text: qrBlock });
      return { content: blocks };
    } catch (err) {
      return { content: [{ type: 'text', text: `Publish failed: ${err instanceof Error ? err.message : String(err)}` }], isError: true };
    }
  },
);

// ── Tool: forkfeed_status ──────────────────────────────────────────────

server.tool(
  'forkfeed_status',
  'Check your current forkfeed content: which forks and feeds you have published.',
  {},
  async () => {
    if (!TOKEN) {
      return {
        content: [{ type: 'text', text: 'Error: FORKFEED_TOKEN not set. Get your API token from forkfeed.link/admin/user/token.' }],
        isError: true,
      };
    }

    try {
      const data = await fetchStatusData();

      if (!data.forks?.length) {
        return {
          content: [{ type: 'text', text: 'No forks published yet. Use forkfeed_guide to learn the format, build content with forkfeed_build, then forkfeed_publish.' }],
        };
      }

      const lines = ['Your forkfeed content:', ''];
      for (const fork of data.forks) {
        lines.push(`Fork: ${fork.title} (${fork.externalForkId})`);
        lines.push(`  Visibility: ${fork.visibility}`);
        lines.push(`  Feeds: ${fork.feeds}`);
        lines.push('');
      }

      if (data.feeds?.length) {
        lines.push('Published feeds:');
        for (const feed of data.feeds) {
          lines.push(`  - ${feed.externalFeedId} | ${feed.title} | ${feed.cardCount ?? 0} cards`);
        }
        lines.push('');
      }

      return { content: [{ type: 'text', text: lines.join('\n') }] };
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Status check failed: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  },
);

// ── Prompt: /forkfeed ──────────────────────────────────────────────────

server.prompt(
  'forkfeed',
  'Turn GitHub commits into swipeable forkfeed content as typed files in your forkserver repo.',
  async () => ({
    messages: [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Turn a commit in this repo into forkfeed content. Follow these steps exactly:

1. Call **forkfeed_guide** and **forkfeed_commits()** in parallel (no arguments for commits = list mode).
2. Show the commits table. Ask which ONE commit to process. One commit at a time, never more. Do NOT ask about image style.
3. Call **forkfeed_commits** with the selected commit SHA. This returns the diff, file stats, and suggested scene images. Do NOT run git commands yourself.
4. Generate the simplified content: sha, feedTitle, feedDescription, forkTitle, forkDescription, and 6 cards with blocks. Use short image IDs (img47) for inline images. Do NOT provide owner, repo, backgrounds, UUIDs, covers, or type wrappers. The builder generates all of that. If the forkserver repo is a different directory, pass its root as outDir.
5. Call **forkfeed_build** with the simplified content. It writes typed .ts files into forks/<forkId>/.
6. Tell the user to run \`npm run convert && npm run typecheck && npm run deploy\` in the forkserver repo, then call **forkfeed_publish** with their deployed forkServerUrl to register the fork.

Start now.`,
        },
      },
    ],
  }),
);

// ── Start ──────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
