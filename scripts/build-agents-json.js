#!/usr/bin/env node
/**
 * Generates website/agents.json from all agent markdown files.
 * Extracts frontmatter fields: name, description, color, emoji, vibe, tools.
 * Adds category (derived from directory name) and slug.
 * Run: node scripts/build-agents-json.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'website', 'agents.json');

const CATEGORIES = [
  'academic', 'design', 'engineering', 'finance', 'game-development',
  'marketing', 'paid-media', 'product', 'project-management', 'sales',
  'spatial-computing', 'specialized', 'strategy', 'support', 'testing',
];

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const raw = match[1];
  const result = {};
  for (const line of raw.split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    result[key] = val;
  }
  return result;
}

const agents = [];

for (const category of CATEGORIES) {
  const dir = path.join(ROOT, category);
  if (!fs.existsSync(dir)) continue;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
  for (const file of files) {
    const content = fs.readFileSync(path.join(dir, file), 'utf8');
    const fm = parseFrontmatter(content);
    if (!fm.name) continue;
    const slug = file.replace('.md', '');
    agents.push({
      slug,
      category,
      name: fm.name || '',
      description: fm.description || '',
      color: fm.color || 'gray',
      emoji: fm.emoji || '🤖',
      vibe: fm.vibe || '',
      tools: fm.tools ? fm.tools.split(',').map(t => t.trim()) : [],
      photo: null,
    });
  }
}

agents.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

fs.mkdirSync(path.join(ROOT, 'website'), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(agents, null, 2));
console.log(`Generated ${OUT} with ${agents.length} agents.`);
