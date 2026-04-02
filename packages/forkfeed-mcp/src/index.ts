#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import QRCode from 'qrcode';
import { GUIDE_CONTENT } from './guide-content.js';
import { IMAGE_CATALOG } from './image-catalog.js';

const APP_SERVER_URL = (
  process.env.APP_SERVER_URL || 'https://api.forkfeed.link'
).replace(/\/+$/, '');
const TOKEN = process.env.FORKFEED_TOKEN || '';

// ── Helpers ────────────────────────────────────────────────────────────

function authHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${TOKEN}`,
  };
}

// ── MCP Server ─────────────────────────────────────────────────────────

const server = new McpServer({
  name: 'forkfeed',
  version: '1.0.0',
});

// ── Tool: forkfeed_guide ───────────────────────────────────────────────

server.tool(
  'forkfeed_guide',
  'Get the complete guide for generating forkfeed content from GitHub commits. Call this first to learn the format before generating content.',
  {},
  async () => ({
    content: [{ type: 'text', text: GUIDE_CONTENT }],
  }),
);

// ── Tool: forkfeed_images ──────────────────────────────────────────────

server.tool(
  'forkfeed_images',
  'Get the IT Scenes image catalog (200 scene images + 30 backgrounds). Use this to pick images that match your content by tags and name. Call after forkfeed_guide.',
  {},
  async () => {
    const scenes = IMAGE_CATALOG.filter((i) => i.id.startsWith('img'));
    const bgs = IMAGE_CATALOG.filter((i) => i.id.startsWith('bg'));

    const lines = [
      '# IT Scenes Image Catalog',
      '',
      'Match images to content by tags and name. Use img* for covers and inline images, bg* for card backgrounds.',
      '',
      'Tags: deploy, git, disaster, debug, hype, victory, beginner, language, lifestyle, workplace, sarcastic, general',
      '',
      '## Scene Images (covers + inline)',
      '',
      ...scenes.map((i) => `${i.id} | ${i.name} | ${i.tags} | ${i.url}`),
      '',
      '## Background Images',
      '',
      ...bgs.map((i) => `${i.id} | ${i.name} | ${i.tags} | ${i.url}`),
    ];

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  },
);

// ── Tool: forkfeed_push ────────────────────────────────────────────────

server.tool(
  'forkfeed_push',
  'Push a generated manifest (forks, feeds, cards) to forkfeed. The manifest JSON must conform to the structure described in forkfeed_guide.',
  {
    manifest: z
      .object({
        forks: z.array(z.any()),
        feeds: z.array(z.any()),
        cards: z.array(z.any()),
      })
      .describe('The complete manifest with forks, feeds, and cards arrays'),
  },
  async ({ manifest }) => {
    if (!TOKEN) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: FORKFEED_TOKEN not set. Get your API token from forkfeed.link/admin/user/token and add it to your .mcp.json env.',
          },
        ],
        isError: true,
      };
    }

    // Save manifest locally before uploading (best-effort, doesn't block push)
    const forkId = manifest.forks?.[0]?._id;
    const filename = `${forkId || `manifest-${Date.now()}`}.json`;
    const dir = join(process.cwd(), 'forkfeed');
    const filepath = join(dir, filename);
    let saveError = '';
    try {
      await mkdir(dir, { recursive: true });
      await writeFile(filepath, JSON.stringify(manifest, null, 2));
    } catch (err) {
      saveError = `Warning: failed to save manifest to ${filepath}: ${err instanceof Error ? err.message : String(err)}`;
    }

    try {
      const res = await fetch(`${APP_SERVER_URL}/api/content/push`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ manifest }),
      });

      const data = await res.json();

      if (!res.ok) {
        return {
          content: [
            {
              type: 'text',
              text: `Push failed (${res.status}): ${data.error || JSON.stringify(data)}`,
            },
          ],
          isError: true,
        };
      }

      const forkSummary = data.forks
        ?.map((f: { title: string; feeds: number }) => `  - ${f.title} (${f.feeds} feeds)`)
        .join('\n');

      // Generate QR code for the first fork's deep link
      const forkId = manifest.forks?.[0]?.id;
      let qrBlock = '';
      if (forkId) {
        const url = `https://forkfeed.link/fork/${forkId}`;
        try {
          const qr = await QRCode.toString(url, { type: 'utf8', errorCorrectionLevel: 'L' });
          qrBlock = [
            '',
            'Scan to open in forkfeed:',
            '',
            qr,
            url,
          ].join('\n');
        } catch {
          qrBlock = `\nLink: ${url}`;
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: [
              'Content pushed successfully!',
              '',
              `Uploaded: ${data.uploaded?.feeds || 0} feeds, ${data.uploaded?.cards || 0} cards`,
              '',
              'Forks:',
              forkSummary || '  (none)',
              '',
              saveError || `Manifest saved to ${filepath}`,
              '',
              'Your content is now live in the forkfeed app. It starts as private.',
              'To make it public, change visibility in the app (requires admin approval).',
              qrBlock,
            ].join('\n'),
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: 'text',
            text: `Push failed: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
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
        content: [
          {
            type: 'text',
            text: 'Error: FORKFEED_TOKEN not set. Get your API token from forkfeed.link/admin/user/token and add it to your .mcp.json env.',
          },
        ],
        isError: true,
      };
    }

    try {
      const res = await fetch(`${APP_SERVER_URL}/api/content/status`, {
        headers: authHeaders(),
      });

      const data = await res.json();

      if (!res.ok) {
        return {
          content: [
            {
              type: 'text',
              text: `Status check failed (${res.status}): ${data.error || JSON.stringify(data)}`,
            },
          ],
          isError: true,
        };
      }

      if (!data.forks?.length) {
        return {
          content: [
            {
              type: 'text',
              text: 'No forks published yet. Use forkfeed_guide to learn how to generate content, then push it with forkfeed_push.',
            },
          ],
        };
      }

      const lines = ['Your forkfeed content:', ''];
      for (const fork of data.forks) {
        lines.push(`Fork: ${fork.title} (${fork.externalForkId})`);
        lines.push(`  Visibility: ${fork.visibility}`);
        lines.push(`  Feeds: ${fork.feeds}`);
        lines.push('');
      }

      return { content: [{ type: 'text', text: lines.join('\n') }] };
    } catch (err) {
      return {
        content: [
          {
            type: 'text',
            text: `Status check failed: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  },
);

// ── Prompt: /forkfeed ──────────────────────────────────────────────────

server.prompt(
  'forkfeed',
  'Turn GitHub commits into swipeable forkfeed content. Analyzes your repo, generates 8-card feeds, and pushes them live.',
  async () => ({
    messages: [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Turn the commits in this repo into forkfeed content. Follow these steps exactly:

1. Call **forkfeed_guide** to get the full content generation guide. Read it carefully.
2. Call **forkfeed_images** to get the IT Scenes image catalog (200 scenes + 30 backgrounds).
3. Detect the current repo from the working directory. Use git to get commit data.
4. Ask which commits to process (default: latest). Do NOT ask about image style (always use IT Scenes).
5. Fetch the diff, analyze it, and generate the 8-card manifest following the guide exactly.
6. Match images from the catalog to card content by tags and semantic similarity.
7. Validate the manifest against the checklist in the guide.
8. Call **forkfeed_push** with the complete manifest to publish it.

Start now. Detect the repo and ask which commits to process.`,
        },
      },
    ],
  }),
);

// ── Start ──────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
