const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const helperSource = fs.readFileSync('skills/install.js', 'utf8');
const pageSource = fs.readFileSync('skills/install.html', 'utf8').match(/<script>\s*([\s\S]*?)<\/script>/)[1];
const catalog = JSON.parse(fs.readFileSync('skills/catalog.json'));
const marketplace = JSON.parse(fs.readFileSync('.agents/plugins/marketplace.json'));
function environment() {
  const nodes = new Map();
  const document = { querySelector: selector => {
    if (!nodes.has(selector)) nodes.set(selector, { hidden: selector === '#options', textContent: '', value: '', addEventListener(event, action) { this[event] = action; } });
    return nodes.get(selector);
  }};
  const context = vm.createContext({ document, URLSearchParams, location: { search: '?skill=agenda' },
    navigator: { clipboard: { writeText: async text => { context.copied = text; } } },
    setTimeout: () => {}, fetch: async () => ({ ok: true, json: async () => catalog }) });
  vm.runInContext(helperSource, context);
  return { context, nodes, helper: context.TravelSkillInstall };
}
test('all catalog skills have real marketplace plugins and valid canonical links', () => {
  const { helper } = environment();
  for (const item of catalog) {
    assert(marketplace.plugins.some(plugin => plugin.name === item.id), item.id);
    assert.equal(helper.deepLink(item.id), `codex://plugins/install/${item.id}?marketplace=travel-design`);
    assert(helper.prompt(item.id).includes(`codex plugin add ${item.id}@travel-design --json`));
    assert(!helper.prompt(item.id).includes('skill.zip'));
  }
  for (const id of [null, '', '../agenda', 'agenda;whoami', '<script>', 'agenda?marketplace=other']) {
    assert.equal(helper.validId(id), false);
    assert.throws(() => helper.deepLink(id));
  }
});
test('Python and web generate identical setup, refresh and install commands', () => {
  const { helper } = environment();
  const result = spawnSync('python3', ['-c', 'import bot,json; print(json.dumps({x:bot.codex_installation_prompt(x) for x in ["agenda","travel-figma-codex-0-8-1"]}))'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  for (const [id, prompt] of Object.entries(JSON.parse(result.stdout))) assert.equal(helper.prompt(id), prompt);
});
test('install page validates selected catalog item and copies full prompt', async () => {
  const { context, nodes, helper } = environment();
  await vm.runInContext(pageSource, context);
  assert.equal(nodes.get('#options').hidden, false);
  assert.equal(nodes.get('#open').href, helper.deepLink('agenda'));
  assert.equal(nodes.get('#title').textContent, catalog.find(item => item.id === 'agenda').name);
  await nodes.get('#copy').click();
  assert.equal(context.copied, helper.prompt('agenda'));
  assert.equal(nodes.get('#copy').textContent, 'Промпт скопирован');
});
test('missing, invalid, or unavailable skill never offers installation', async () => {
  for (const scenario of ['missing', 'invalid', 'offline']) {
    const { context, nodes } = environment();
    if (scenario === 'missing') context.location.search = '?skill=deleted-skill';
    if (scenario === 'invalid') context.location.search = '?skill=..%2Fagenda';
    if (scenario === 'offline') context.fetch = async () => ({ ok: false });
    await vm.runInContext(pageSource, context);
    assert(!nodes.has('#open'));
    assert(!nodes.has('#options') || nodes.get('#options').hidden);
    assert(nodes.get('#status').textContent.length > 0);
  }
});
test('clipboard denial uses fallback and reports failure truthfully', async () => {
  const { context, helper } = environment();
  context.navigator.clipboard.writeText = async () => { throw Error('denied'); };
  let removed = false;
  context.document.createElement = () => ({ style: {}, select() {}, remove() { removed = true; } });
  context.document.body = { append() {} };
  context.document.execCommand = () => false;
  const button = { textContent: 'Скопировать промпт' };
  assert.equal(await helper.copy('prompt', button), false);
  assert.equal(removed, true);
  assert.equal(button.textContent, 'Не удалось скопировать');
});
test('Store renders both methods for every skill, including old custom ZIP prompts', async () => {
  const { context, nodes } = environment();
  function element(tag) {
    return { tag, textContent: '', children: [], style: {},
      append(...children) { this.children.push(...children); },
      replaceChildren(...children) { this.children = children; },
      setAttribute() {}, cloneNode() { return element(tag); },
      addEventListener(event, fn) { this[event] = fn; },
    };
  }
  context.document.createElement = element;
  for (const id of ['#skills', '#base-skills', '#base']) nodes.set(id, element('section'));
  context.window = {};
  context.fetch = async () => ({ ok: true, json: async () => catalog.map(item => ({ ...item, prompt: 'Распакуй старый ZIP' })) });
  const source = fs.readFileSync('skills/index.html', 'utf8').match(/<script>\s*([\s\S]*?)<\/script>/)[1];
  await vm.runInContext(source, context);
  const cards = [...nodes.get('#skills').children, ...nodes.get('#base-skills').children];
  assert.equal(cards.length, catalog.length);
  for (const card of cards) {
    const button = card.children.find(child => child.tag === 'button');
    const link = card.children.find(child => child.tag === 'a');
    assert(link.href.startsWith('install.html?skill='));
    await button.click();
    assert(context.copied.includes('codex plugin marketplace add'));
    assert(!context.copied.includes('старый ZIP'));
  }
});
