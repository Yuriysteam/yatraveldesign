const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('skills/index.html', 'utf8');
const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
function storePrompt(items) {
  const context = {window: {}, document: {querySelector: () => ({})}, location: {href: 'https://example.test/skills/'}, URL, fetch: () => new Promise(() => {})};
  vm.createContext(context);
  vm.runInContext(script + '\nthis.installPrompt = prompt;', context);
  return context.installPrompt(items);
}
test('plain skills and dependencies use complete ZIP archives in dependency order', () => {
  const prompt = storePrompt([{id: 'base', name: 'Base'}, {id: 'example', name: 'Example'}]);
  assert.match(prompt, /skills\/base\/skill.zip/);
  assert.match(prompt, /skills\/example\/skill.zip/);
  assert.ok(prompt.indexOf('base/skill.zip') < prompt.indexOf('example/skill.zip'));
  assert.match(prompt, /SKILL.md/);
});
test('bundles keep their checked install.py workflow', () => {
  const prompt = storePrompt([{id: 'bundle', name: 'Bundle', installation: {type: 'script'}}]);
  assert.match(prompt, /python3 install.py --check/);
  assert.match(prompt, /затем python3 install.py/);
  assert.match(prompt, /При конфликте не заменяй skills/);
});
test('author prompt is preserved and marketplace onboarding is absent', () => {
  assert.equal(storePrompt([{id: 'example', name: 'Example', prompt: 'Custom installation'}]), 'Custom installation');
  assert.doesNotMatch(html, /codex:\/\/|marketplace|install\.html|TravelSkillInstall/);
});
