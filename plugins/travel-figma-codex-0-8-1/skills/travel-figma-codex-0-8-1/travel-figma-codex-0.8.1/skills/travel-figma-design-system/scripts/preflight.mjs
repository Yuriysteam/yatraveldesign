#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.resolve(scriptDir, '..');
const refs = path.join(skillRoot, 'references');

async function readText(relativePath) {
  return fs.readFile(path.join(skillRoot, relativePath), 'utf8');
}

async function readJson(relativePath) {
  return JSON.parse(await readText(relativePath));
}

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
}

const requiredFiles = [
  'references/base20-figma-map.md',
  'references/base20-figma-components.json',
  'references/organisms20-figma-map.md',
  'references/readiness-gate.md',
];

for (const relativePath of requiredFiles) {
  try {
    const stat = await fs.stat(path.join(skillRoot, relativePath));
    if (!stat.isFile() || stat.size === 0) fail(`${relativePath} отсутствует или пуст`);
  } catch {
    fail(`${relativePath} отсутствует`);
  }
}

let index;
try {
  index = await readJson('references/base20-figma-components.json');
} catch (error) {
  fail(`base20-figma-components.json не читается: ${error.message}`);
}

if (index) {
  const source = index.source || {};
  const pages = Array.isArray(index.pages) ? index.pages : [];
  const sets = pages.flatMap((page) => Array.isArray(page.componentSets) ? page.componentSets : []);
  const validSets = sets.filter((set) => set && set.id && set.key && set.name && set.axes && typeof set.axes === 'object');
  const keys = validSets.map((set) => set.key);
  const duplicateKeys = keys.filter((key, position) => keys.indexOf(key) !== position);

  if (!source.fileKey || !source.url || !source.auditedAt) fail('у Base 2.0 snapshot нет fileKey, url или auditedAt');
  if (pages.length === 0) fail('Base 2.0 snapshot не содержит страниц');
  if (sets.length === 0 || validSets.length !== sets.length) fail('не все component sets содержат id, key, name и axes');
  if (duplicateKeys.length > 0) fail(`в Base 2.0 snapshot есть повторяющиеся component-set keys: ${new Set(duplicateKeys).size}`);

  console.log(`PASS Base 2.0 snapshot: ${pages.length} pages, ${sets.length} component sets, audited ${source.auditedAt}`);
  console.log(`SOURCE ${source.url}`);
}

try {
  const baseMap = await readText('references/base20-figma-map.md');
  const organismsMap = await readText('references/organisms20-figma-map.md');
  if (!baseMap.includes('Variables и styles') || !baseMap.includes('semantic tokens')) {
    fail('Base 2.0 map не содержит раздела variables/styles и semantic tokens');
  }
  if (!organismsMap.includes('Organisms 2.0')) fail('карта Organisms 2.0 не распознана');
} catch (error) {
  fail(`карты дизайн-системы не читаются: ${error.message}`);
}

if (!process.exitCode) {
  console.log(`PASS local DS knowledge: ${refs}`);
  console.log('NOT_CHECKED live Figma masters, variables, styles and target-file library access');
}
