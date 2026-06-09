#!/usr/bin/env node
// forkfeed plugin CLI - zero dependencies (Node 18+ built-ins only).
//
//   node forkfeed.mjs commits [--cwd <dir>]
//   node forkfeed.mjs suggest --sha <sha> [--cwd <dir>]
//   node forkfeed.mjs publish --file <content.json> [--dry-run] [--cwd <dir>]
//
// `publish` turns the simplified content (sha + 5 fields + 6 cards of blocks)
// into the full app-native payload (cover variants, backgrounds, resolved image
// URLs, GitHub action url) and POSTs it to the forkfeed app-server, which stores
// and serves it. Tokenless and anonymous: no login, no secrets. App-native: no
// forkserver, no deploy.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { IMAGE_CATALOG, resolveImageId } from './image-catalog.mjs';

const SEP = '\x1e'; // ASCII record separator, safe inside commit messages

// ── Git helpers ────────────────────────────────────────────────────────────

function git(args, cwd) {
  try {
    // stdio: capture stderr into the error (not the parent console) so expected
    // failures like getRepoInfo() in a non-repo stay quiet.
    return execFileSync('git', args, {
      cwd, encoding: 'utf8', maxBuffer: 5 * 1024 * 1024, timeout: 15_000,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (err) {
    if (err.code === 'ENOENT') throw new Error('git not found. Ensure git is installed and in PATH.');
    const stderr = err.stderr ? String(err.stderr).trim() : '';
    throw new Error(stderr || err.message || 'git command failed');
  }
}

function isGitRepo(cwd) {
  try { git(['rev-parse', '--is-inside-work-tree'], cwd); return true; } catch { return false; }
}

function getRepoInfo(cwd) {
  try {
    const url = git(['remote', 'get-url', 'origin'], cwd).trim();
    const m = url.match(/github\.com[/:]([^/]+)\/([^/.]+)/);
    if (m) return { owner: m[1], repo: m[2] };
  } catch { /* no remote */ }
  return { owner: null, repo: basename(resolve(cwd)) };
}

function getCommitList(cwd, count = 15) {
  const fmt = `%H${SEP}%h${SEP}%s${SEP}%an${SEP}%aI`;
  const raw = git(['log', '--no-merges', `-${count}`, `--format=${fmt}`], cwd);
  return raw.trim().split('\n').filter(Boolean).map((line) => {
    const [sha, shortSha, message, author, date] = line.split(SEP);
    return { sha, shortSha, message, author, date: (date || '').slice(0, 10) };
  });
}

function truncateDiff(diff, maxLinesPerFile = 200) {
  const fileDiffs = diff.split(/^(?=diff --git )/m);
  return fileDiffs.map((fd) => {
    if (fd.includes('Binary files')) {
      const path = fd.match(/diff --git a\/(.+?) b\//)?.[1] || 'unknown';
      return `Binary file: ${path} (skipped)`;
    }
    const lines = fd.split('\n');
    if (lines.length <= maxLinesPerFile) return fd;
    return lines.slice(0, maxLinesPerFile).join('\n') + `\n... [truncated, ${lines.length - maxLinesPerFile} more lines]`;
  }).join('\n');
}

function getCommitDetail(cwd, sha) {
  const meta = git(['show', sha, `--format=%H${SEP}%h${SEP}%s${SEP}%an${SEP}%aI`, '--no-patch'], cwd);
  const stats = git(['diff', `${sha}^..${sha}`, '--stat'], cwd);
  const diff = git(['diff', `${sha}^..${sha}`, '-U3'], cwd);
  const [fullSha, shortSha, message, author, date] = meta.trim().split(SEP);
  return {
    sha: fullSha, shortSha, message, author,
    date: (date || '').slice(0, 10),
    stats: stats.trim(),
    diff: truncateDiff(diff),
  };
}

function parseFilePathsFromStats(stats) {
  const matches = stats.match(/^\s*(.+?)\s+\|/gm) || [];
  return matches.map((m) => m.trim().replace(/\s+\|$/, ''));
}

// ── Tag detection + background assignment ───────────────────────────────────

const TAG_KEYWORDS = {
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

const PATH_TAGS = [
  [/\.(test|spec)\.[jt]sx?$/, 'debug'],
  [/\.github\/workflows|Dockerfile|docker|\.ci|Jenkinsfile/, 'deploy'],
  [/\.env|config/, 'lifestyle'],
];

function detectTags(message, filePaths) {
  const tags = new Set();
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

const BG_PREFS = [
  ['bg10', 'bg27'],                          // 0: ELI5
  ['bg11', 'bg1'],                           // 1: Roast
  ['bg25', 'bg24'],                          // 2: LinkedIn
  ['bg12', 'bg13', 'bg14', 'bg15', 'bg17'],  // 3: Learning (tech-match)
  ['bg25', 'bg30'],                          // 4: Alternatives
  ['bg18', 'bg5'],                           // 5: Quiz
];

const LANG_BG = {
  javascript: 'bg12', typescript: 'bg12',
  python: 'bg13', rust: 'bg14', deploy: 'bg15',
};

function assignBackgrounds(tags) {
  const used = new Set();
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

function filterImagesByTags(tags) {
  const tagSet = new Set(tags);
  const score = (entry) => entry.tags.split(',').map((t) => t.trim()).filter((t) => tagSet.has(t)).length;
  const pick = (prefix, limit) => IMAGE_CATALOG
    .filter((i) => i.id.startsWith(prefix))
    .map((i) => ({ ...i, s: score(i) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((i) => `${i.id} | ${i.name} | ${i.tags}`);
  return { scenes: pick('img', 30), backgrounds: pick('bg', 10) };
}

// ── Fixed cover titles per card index ───────────────────────────────────────

const COVERS = [
  { title: "🧒 Explain Like I'm 5", subtitle: "Hopefully now you'll understand what you pushed" },
  { title: '🔥 The Roast', subtitle: 'Your code had it coming' },
  { title: '💼 The LinkedIn Post', subtitle: 'Mass cringe, freshly generated' },
  { title: '💡 Learning Moment', subtitle: 'Something useful buried in your chaos' },
  { title: '🔀 Alternatives', subtitle: 'What you could have done instead' },
  { title: '🧠 Quiz', subtitle: "Let's see if you even understand your own code" },
];

// ── Simplified block inference ──────────────────────────────────────────────

function inferBlock(block) {
  if (!block || typeof block !== 'object') throw new Error('block must be an object');
  if ('question' in block) {
    return {
      type: 'CONTENT_QUIZ',
      question: block.question,
      options: block.options,
      ...(block.explanation != null ? { explanation: block.explanation } : {}),
    };
  }
  if ('name' in block && 'avatar' in block) {
    const avatar = block.avatar;
    return {
      type: 'CONTENT_SOCIAL',
      name: block.name,
      avatarSrc: typeof avatar === 'string' && avatar.startsWith('http') ? avatar : resolveImageId(avatar),
      source: block.source,
      ...(block.subtitle != null ? { subtitle: block.subtitle } : {}),
    };
  }
  if ('label' in block && 'action' in block && 'target' in block) {
    return { type: 'CONTENT_BUTTON', label: block.label, action: block.action, target: block.target };
  }
  if ('img' in block) {
    const img = block.img;
    return {
      type: 'CONTENT_IMAGE',
      imageSrc: typeof img === 'string' && img.startsWith('http') ? img : resolveImageId(img),
      sizing: block.sizing || 'wide',
    };
  }
  if ('code' in block) {
    return { type: 'CONTENT_CODE', code: block.code, ...(block.lang != null ? { language: block.lang } : {}) };
  }
  if ('subtext' in block) return { type: 'CONTENT_SUBTEXT', text: block.subtext };
  if ('title' in block) return { type: 'CONTENT_TITLE', title: block.title };
  if ('text' in block) return { type: 'CONTENT_TEXT', text: block.text };
  throw new Error(`Cannot infer block type from fields: ${Object.keys(block).join(', ')}`);
}

// ── Build the app-native payload ────────────────────────────────────────────

function validateContentInput(content) {
  if (!content || typeof content !== 'object') throw new Error('content must be a JSON object');
  for (const k of ['sha', 'feedTitle', 'feedDescription', 'forkTitle', 'forkDescription']) {
    if (typeof content[k] !== 'string' || !content[k].trim()) throw new Error(`content.${k} is required`);
  }
  if (content.feedTitle.length > 60) throw new Error('content.feedTitle max 60 chars');
  if (!Array.isArray(content.cards) || content.cards.length !== 6) throw new Error('content.cards must have exactly 6 cards');
  content.cards.forEach((card, i) => {
    if (!card || !Array.isArray(card.variants) || card.variants.length < 1) throw new Error(`cards[${i}].variants must be a non-empty array`);
    card.variants.forEach((v, vi) => {
      if (!v || !Array.isArray(v.blocks) || v.blocks.length < 1) throw new Error(`cards[${i}].variants[${vi}].blocks must be a non-empty array`);
    });
  });
  for (const key of ['bgOverride', 'coverOverride']) {
    if (content[key] != null && (!Array.isArray(content[key]) || content[key].length !== 6)) {
      throw new Error(`content.${key} must be an array of 6 image ids`);
    }
  }
}

function buildPayload(content, cwd) {
  const repoInfo = getRepoInfo(cwd);
  const owner = repoInfo.owner || 'local';
  const sha7 = content.sha.slice(0, 7);
  const forkSlug = `tfip-${owner}-${repoInfo.repo}`;
  const feedSlug = `tfip-${owner}-${repoInfo.repo}-${sha7}`;

  let bgs;
  if (content.bgOverride) {
    bgs = content.bgOverride;
  } else {
    const message = git(['show', content.sha, '--format=%s', '--no-patch'], cwd).trim();
    const filePaths = parseFilePathsFromStats(git(['diff', `${content.sha}^..${content.sha}`, '--stat'], cwd));
    bgs = assignBackgrounds(detectTags(message, filePaths));
  }
  const bgUrls = bgs.map(resolveImageId);
  const coverUrls = content.coverOverride ? content.coverOverride.map(resolveImageId) : bgUrls;
  const actionUrl = repoInfo.owner ? `https://github.com/${repoInfo.owner}/${repoInfo.repo}` : undefined;

  const cards = content.cards.map((card, i) => {
    const cover = { type: 'FULL_IMAGE', imageSrc: coverUrls[i], title: COVERS[i].title, subtitle: COVERS[i].subtitle };
    const details = card.variants.map((v) => ({
      type: 'CONTENT',
      backgroundSrc: bgUrls[i],
      blocks: v.blocks.map(inferBlock),
    }));
    return { variants: [cover, ...details] };
  });

  const fork = {
    slug: forkSlug,
    title: content.forkTitle,
    description: content.forkDescription,
    imageSrc: coverUrls[0],
    ...(actionUrl ? { actionLabel: 'View on GitHub', actionUrl } : {}),
  };
  const feed = {
    slug: feedSlug,
    title: content.feedTitle,
    description: content.feedDescription,
    imageSrc: coverUrls[0],
    mode: 'sequential',
    scrollDirection: 'vertical',
    engagement: true,
    cards,
  };
  return { payload: { fork, feeds: [feed] }, forkSlug, feedSlug };
}

function validateBuiltPayload(payload) {
  const errors = [];
  for (const feed of payload.feeds) {
    feed.cards.forEach((card, ci) => {
      if (card.variants.length < 2) errors.push(`card[${ci}] needs a cover + at least one detail variant`);
      card.variants.forEach((v, vi) => {
        if (v.type === 'CONTENT') {
          for (const b of v.blocks) {
            if (b.type === 'CONTENT_QUIZ' && !(Array.isArray(b.options) && b.options.some((o) => o && o.correct === true))) {
              errors.push(`card[${ci}].variants[${vi}]: CONTENT_QUIZ needs at least one correct option`);
            }
          }
        }
      });
    });
  }
  if (errors.length) throw new Error(`Validation failed:\n${errors.join('\n')}`);
}

// ── Subcommands ─────────────────────────────────────────────────────────────

function cmdCommits(cwd) {
  if (!isGitRepo(cwd)) { console.error('Not in a git repo. Run inside a git repository.'); process.exit(1); }
  const list = getCommitList(cwd);
  if (!list.length) { console.log('No commits found.'); return; }
  const lines = ['| # | SHA | Message | Author | Date |', '|---|-----|---------|--------|------|'];
  list.forEach((c, i) => lines.push(`| ${i + 1} | ${c.shortSha} | ${c.message.slice(0, 60)} | ${c.author} | ${c.date} |`));
  console.log(lines.join('\n'));
}

function cmdSuggest(cwd, sha) {
  if (!isGitRepo(cwd)) { console.error('Not in a git repo. Run inside a git repository.'); process.exit(1); }
  const detail = getCommitDetail(cwd, sha);
  const tags = detectTags(detail.message, parseFilePathsFromStats(detail.stats));
  const { scenes } = filterImagesByTags(tags);
  console.log([
    `## Commit: ${detail.shortSha} - ${detail.message}`,
    `Author: ${detail.author} | Date: ${detail.date}`,
    '', '## File Stats', detail.stats,
    '', '## Diff', detail.diff,
    '', `## Suggested scene images (tags: ${tags.join(', ')})`,
    'Use short ids (e.g. img47) in card blocks. Card backgrounds are auto-assigned.',
    '', ...scenes,
  ].join('\n'));
}

async function cmdPublish(cwd, file, dryRun) {
  let content;
  try { content = JSON.parse(readFileSync(file, 'utf8')); }
  catch (err) { console.error(`Failed to read content file "${file}": ${err.message}`); process.exit(1); }

  validateContentInput(content);
  const { payload, forkSlug, feedSlug } = buildPayload(content, cwd);
  validateBuiltPayload(payload);
  const cardCount = payload.feeds[0].cards.length;

  if (dryRun) {
    console.log(JSON.stringify(payload, null, 2));
    console.log(`\n[dry-run] OK: fork=${forkSlug} feed=${feedSlug} cards=${cardCount}. Nothing was published.`);
    return;
  }

  // Tokenless: no login, no secrets. Content publishes anonymously and unlisted.
  const base = (process.env.APP_SERVER_URL || 'https://api.forkfeed.link').replace(/\/+$/, '');

  let res, data;
  try {
    res = await fetch(`${base}/api/content/publish-native`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20_000),
    });
    data = await res.json().catch(() => ({}));
  } catch (err) {
    console.error(`Publish request failed: ${err.message}`); process.exit(1);
  }
  if (!res.ok) {
    console.error(`Publish failed (${res.status}): ${data.error || JSON.stringify(data)}`); process.exit(1);
  }

  console.log('Published (unlisted, shareable by link).');
  console.log(`  Fork:  ${data.fork?.title || forkSlug}`);
  console.log(`  Feeds: ${data.feeds?.length ?? 1}`);
  console.log(`  Cards: ${data.cardsStored ?? cardCount}`);
  if (data.url) console.log(`  Open:  ${data.url}`);
  if (data.qr) console.log('\nScan to open it in the app on your phone:\n' + data.qr);
  console.log('\nAnyone with the link can view it; it will not appear in discovery.');
}

// ── Arg parsing + entry ─────────────────────────────────────────────────────

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') out.dryRun = true;
    else if (a === '--sha') out.sha = argv[++i];
    else if (a === '--file') out.file = argv[++i];
    else if (a === '--cwd') out.cwd = argv[++i];
  }
  return out;
}

async function main() {
  const [sub, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);
  const cwd = args.cwd || process.cwd();

  switch (sub) {
    case 'commits':
      cmdCommits(cwd);
      break;
    case 'suggest':
      if (!args.sha) { console.error('Usage: forkfeed.mjs suggest --sha <sha> [--cwd <dir>]'); process.exit(1); }
      cmdSuggest(cwd, args.sha);
      break;
    case 'publish':
      if (!args.file) { console.error('Usage: forkfeed.mjs publish --file <content.json> [--dry-run] [--cwd <dir>]'); process.exit(1); }
      await cmdPublish(cwd, args.file, !!args.dryRun);
      break;
    default:
      console.error('Usage: forkfeed.mjs <commits|suggest|publish> [options]');
      process.exit(1);
  }
}

main().catch((err) => { console.error(err.message || String(err)); process.exit(1); });
