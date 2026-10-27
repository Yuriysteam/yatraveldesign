#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

const [baseRootArg, storybookMode = 'check-live'] = process.argv.slice(2);
const allowedModes = new Set(['offline', 'check-live', 'require-live']);

if (!baseRootArg || !path.isAbsolute(baseRootArg) || !allowedModes.has(storybookMode)) {
  console.error('Использование: verify-baseai.mjs <absolute-baseai-root> [offline|check-live|require-live]');
  process.exit(2);
}

const baseRoot = path.resolve(baseRootArg);
const errors = [];

async function readJson(relativePath) {
  try {
    return JSON.parse(await fs.readFile(path.join(baseRoot, relativePath), 'utf8'));
  } catch (error) {
    errors.push(`${relativePath}: ${error.message}`);
    return null;
  }
}

async function existsFile(relativePath) {
  try {
    return (await fs.stat(path.join(baseRoot, relativePath))).isFile();
  } catch {
    return false;
  }
}

const manifest = await readJson('manifest.json');
const components = await readJson('components.json');
const snippets = await readJson('snippets/snippets.json');
const icons = await readJson('icons/index.json');
const iconItems = Array.isArray(icons) ? icons : icons?.icons;

if (!manifest?.snapshotDate || !manifest?.source || !manifest?.storybookIndex) {
  errors.push('manifest.json: нужны snapshotDate, source и storybookIndex');
}
if (manifest?.designSystem !== 'new') errors.push('manifest.json: designSystem должен быть new');
if (!Array.isArray(components) || components.length === 0) errors.push('components.json: пустой или неверный формат');
if (!Array.isArray(snippets) || snippets.length === 0) errors.push('snippets/snippets.json: пустой или неверный формат');
if (!Array.isArray(iconItems) || iconItems.length === 0) errors.push('icons/index.json: пустой или неверный формат');

if (Array.isArray(components)) {
  const seen = new Set();
  for (const component of components) {
    if (!component?.name || seen.has(component.name)) errors.push(`components.json: отсутствующее или повторное имя ${component?.name || '<empty>'}`);
    seen.add(component?.name);
    for (const field of ['markup', 'meta']) {
      if (!component?.[field] || !(await existsFile(component[field]))) {
        errors.push(`components.json: ${component?.name || '<unknown>'} не разрешает ${field}`);
      }
    }
  }
}

if (Array.isArray(snippets)) {
  const seen = new Set();
  for (const snippet of snippets) {
    if (!snippet?.id || seen.has(snippet.id)) errors.push(`snippets: отсутствующий или повторный id ${snippet?.id || '<empty>'}`);
    seen.add(snippet?.id);
    if (!snippet?.path || !(await existsFile(snippet.path))) errors.push(`snippets: ${snippet?.id || '<unknown>'} не разрешает path`);
  }
}

let tokenCount = 0;
try {
  const tokens = await fs.readFile(path.join(baseRoot, 'tokens/theme-vars.css'), 'utf8');
  tokenCount = new Set([...tokens.matchAll(/--[A-Za-z0-9_-]+\s*:/g)].map((match) => match[0].replace(/\s*:$/, ''))).size;
  if (tokenCount === 0) errors.push('tokens/theme-vars.css: semantic CSS variables не найдены');
} catch (error) {
  errors.push(`tokens/theme-vars.css: ${error.message}`);
}

for (const relativePath of ['AGENT.md', 'AI_USAGE.md', 'fonts.css', 'library.css', 'principles/validation.md']) {
  if (!(await existsFile(relativePath))) errors.push(`${relativePath}: обязательный файл отсутствует`);
}

if (errors.length > 0) {
  for (const error of errors) console.error(`FAIL ${error}`);
  process.exit(1);
}

console.log(`PASS BaseAI snapshot: ${manifest.version || '<unknown version>'}, ${components.length} components, ${snippets.length} snippets, ${iconItems.length} icons, ${tokenCount} CSS tokens`);
console.log(`SNAPSHOT ${manifest.snapshotDate} ${manifest.source}`);

if (storybookMode === 'offline') {
  console.log('NOT_CHECKED Storybook live index');
  process.exit(0);
}

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 8000);
try {
  const response = await fetch(manifest.storybookIndex, { signal: controller.signal, headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const liveIndex = await response.json();
  const liveEntries = liveIndex?.entries && typeof liveIndex.entries === 'object'
    ? Object.keys(liveIndex.entries).length
    : Object.keys(liveIndex || {}).length;
  if (liveEntries === 0) throw new Error('пустой или неизвестный формат index.json');
  console.log(`PASS Storybook live: ${liveEntries} entries, ${manifest.storybookIndex}`);
} catch (error) {
  console.error(`SNAPSHOT_ONLY Storybook live недоступен: ${error.message}`);
  if (storybookMode === 'require-live') process.exitCode = 1;
} finally {
  clearTimeout(timeout);
}
