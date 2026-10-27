import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const verifier = path.resolve(testDir, '../scripts/verify-baseai.mjs');

function write(root, relativePath, content) {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

function createFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'baseai-readiness-'));
  write(root, 'manifest.json', JSON.stringify({
    version: 'test', snapshotDate: '2026-01-01', designSystem: 'new',
    source: 'https://storybook.example/', storybookIndex: 'https://storybook.example/index.json',
  }));
  write(root, 'components.json', JSON.stringify([{ name: 'Button', markup: 'components/Button/markup.html', meta: 'components/Button/meta.json' }]));
  write(root, 'components/Button/markup.html', '<button class="button">Test</button>');
  write(root, 'components/Button/meta.json', '{}');
  write(root, 'snippets/snippets.json', JSON.stringify([{ id: 'button', path: 'snippets/button.html' }]));
  write(root, 'snippets/button.html', '<button class="button">Test</button>');
  write(root, 'icons/index.json', JSON.stringify({ icons: [{ name: 'close' }] }));
  write(root, 'tokens/theme-vars.css', ':root { --color-text-primary: #000; }');
  for (const file of ['AGENT.md', 'AI_USAGE.md', 'fonts.css', 'library.css', 'principles/validation.md']) write(root, file, 'fixture');
  return root;
}

function run(root) {
  return spawnSync(process.execPath, [verifier, root, 'offline'], { encoding: 'utf8' });
}

test('valid snapshot reports component and token evidence', () => {
  const root = createFixture();
  try {
    const result = run(root);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /PASS BaseAI snapshot/);
    assert.match(result.stdout, /1 components, 1 snippets, 1 icons, 1 CSS tokens/);
    assert.match(result.stdout, /NOT_CHECKED Storybook live index/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('broken component provenance blocks readiness', () => {
  const root = createFixture();
  try {
    fs.unlinkSync(path.join(root, 'components/Button/markup.html'));
    const result = run(root);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /не разрешает markup/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
