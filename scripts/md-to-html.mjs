import { readFileSync, writeFileSync } from 'fs';

const srcFile = process.argv[2];
if (!srcFile) { console.error('Usage: node md-to-html.mjs <file.md>'); process.exit(1); }

const md = readFileSync(srcFile, 'utf8');
const destFile = srcFile.replace(/\.md$/, '.html');

const allPrompts = [];
const re = /^## (IMAGE \d+|BG \d+) -- (.+)\n\n([\s\S]+?)(?=\n## |\n*$)/gm;
let m;
while ((m = re.exec(md)) !== null) {
  allPrompts.push({ id: m[1], title: m[2].trim(), body: m[3].trim() });
}

const isBg = allPrompts[0]?.id.startsWith('BG');
const first = allPrompts[0]?.id;
const last = allPrompts[allPrompts.length - 1]?.id;
const subtitle = `${allPrompts.length} ${isBg ? 'background' : 'image'} prompts (${first} - ${last})`;

let html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>IT Scenes -- Image Prompts</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #1a1a2e; color: #e0e0e0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 24px; }
  h1 { font-size: 1.4rem; font-weight: 600; margin-bottom: 20px; color: #fff; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; padding: 10px 12px; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #888; border-bottom: 1px solid #2a2a4a; }
  td { padding: 10px 12px; border-bottom: 1px solid #2a2a4a; vertical-align: middle; }
  tr:hover { background: #22223a; }
  .num { font-weight: 600; white-space: nowrap; color: #ccc; font-size: 0.85rem; }
  .num.bg { color: #7c8aaf; }
  .location { color: #b0b8d0; font-size: 0.85rem; }
  .copy-btn {
    background: #2d2d5e; border: 1px solid #3d3d7a; color: #a0a8e0; padding: 6px 16px;
    border-radius: 6px; cursor: pointer; font-size: 0.8rem; font-family: inherit;
    transition: all 0.15s ease;
  }
  .copy-btn:hover { background: #3a3a7a; color: #fff; }
  .copy-btn.copied { background: #1a4a2a; border-color: #2a6a3a; color: #6fcf8a; }
</style>
</head>
<body>
<h1>IT Scenes -- Image Prompts</h1>
<p style="color:#888;font-size:0.8rem;margin:-12px 0 16px;">${subtitle}</p>
<table>
  <thead><tr><th>#</th><th>Location</th><th></th></tr></thead>
  <tbody id="rows"></tbody>
</table>
<` + `script>
const prompts = [
`;

for (let i = 0; i < allPrompts.length; i++) {
  const p = allPrompts[i];
  const escaped = p.body.replace(/\\/g, '\\\\').replace(/`/g, '\\`');
  html += `["${p.id}","${p.title}",\`${escaped}\`]`;
  html += i < allPrompts.length - 1 ? ',\n' : '\n';
}

html += `];

const tbody = document.getElementById('rows');
prompts.forEach(([num, location, prompt], i) => {
  const tr = document.createElement('tr');
  const isBg = num.startsWith('BG');
  if (i > 0 && isBg && !prompts[i-1][0].startsWith('BG')) {
    const sep = document.createElement('tr');
    sep.innerHTML = '<td colspan="3" style="padding:2px;border-bottom:2px solid #3a3a5a"></td>';
    tbody.appendChild(sep);
  }
  tr.innerHTML = \`
    <td class="num\${isBg ? ' bg' : ''}">\${num}</td>
    <td class="location">\${location}</td>
    <td><button class="copy-btn" type="button">Copy</button></td>\`;
  tr.querySelector('.copy-btn').addEventListener('click', function() {
    navigator.clipboard.writeText(prompt);
    this.textContent = 'Copied';
    this.classList.add('copied');
  });
  tbody.appendChild(tr);
});
<` + `/script>
</body>
</html>
`;

writeFileSync(destFile, html, 'utf8');
console.log(`Wrote ${destFile} (${allPrompts.length} prompts)`);
