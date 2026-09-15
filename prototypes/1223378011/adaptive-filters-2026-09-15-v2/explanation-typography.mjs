const NBSP = '\u00a0';

const PREPOSITIONS = [
  'в', 'во', 'на', 'по', 'для', 'с', 'со', 'к', 'ко', 'у', 'о', 'об', 'обо',
  'от', 'ото', 'до', 'из', 'из-за', 'из-под', 'за', 'над', 'надо', 'под', 'подо',
  'перед', 'передо', 'при', 'про', 'без', 'безо', 'через', 'между', 'меж',
  'среди', 'около', 'после', 'помимо', 'вместо', 'кроме', 'благодаря', 'ввиду',
  'вследствие', 'насчет', 'насчёт', 'относительно', 'посредством', 'согласно',
  'соответственно', 'вопреки', 'навстречу', 'вдоль', 'вокруг', 'впереди', 'возле',
  'внутри', 'вне', 'поверх', 'позади', 'поперек', 'поперёк', 'против', 'ради',
  'сквозь', 'спустя', 'путем', 'путём', 'наподобие', 'вроде', 'свыше', 'посреди',
  'и', 'а', 'но', 'или',
];

const COMPOUND_PREPOSITIONS = [
  'в течение', 'в продолжение', 'в заключение', 'в связи с', 'в отличие от',
  'в зависимости от', 'по отношению к', 'по сравнению с', 'в соответствии с',
  'несмотря на', 'невзирая на', 'за счет', 'за счёт', 'по поводу', 'по мере',
  'в силу', 'в целях', 'в рамках', 'в отношении', 'в качестве', 'за исключением',
];

const WORDS = [...COMPOUND_PREPOSITIONS, ...PREPOSITIONS]
  .sort((a, b) => b.length - a.length)
  .map(word => word.replaceAll(' ', '[ \\t\\r\\n\\f\\u00a0]+'))
  .join('|');

// Unicode boundaries keep short words out of Cyrillic words, ids and compounds.
// Look ahead without consuming the next word so consecutive prepositions all bind.
const PREPOSITION_PATTERN = new RegExp(
  `(?<![\\p{L}\\p{N}_-])(?:${WORDS})[ \\t\\r\\n\\f]+(?=[«„“"'‘(\\[{]*[\\p{L}\\p{N}])`,
  'giu',
);

function whitespaceEdits(text) {
  const edits = [];
  for (const match of text.matchAll(PREPOSITION_PATTERN)) {
    for (const space of match[0].matchAll(/[ \t\r\n\f]+/g)) {
      edits.push({ start: match.index + space.index, end: match.index + space.index + space[0].length });
    }
  }
  return edits;
}

export function bindRussianPrepositions(text) {
  let result = text;
  for (const { start, end } of whitespaceEdits(text).reverse()) {
    result = result.slice(0, start) + NBSP + result.slice(end);
  }
  return result;
}

const FLOW_BOUNDARIES = new Set([
  'ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'BR', 'BUTTON', 'CAPTION', 'DD',
  'DETAILS', 'DIALOG', 'DIV', 'DL', 'DT', 'FIELDSET', 'FIGCAPTION', 'FIGURE',
  'FOOTER', 'FORM', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HEADER', 'HGROUP', 'HR',
  'INPUT', 'LEGEND', 'LI', 'MAIN', 'NAV', 'OL', 'P', 'SECTION', 'SELECT', 'SUMMARY',
  'TABLE', 'TBODY', 'TD', 'TFOOT', 'TH', 'THEAD', 'TR', 'UL',
]);
const SKIP_CONTENT = new Set(['CODE', 'NOSCRIPT', 'PRE', 'SCRIPT', 'STYLE', 'TEXTAREA']);

// Only text data changes; element identities, attributes and listeners survive.
// Inline nodes share a flow, while blocks and explicit line breaks separate it.
export function applyExplanationTypography(root) {
  let nodes = [];

  function flush() {
    const edits = whitespaceEdits(nodes.map(node => node.data).join(''));
    let offset = 0;
    for (const node of nodes) {
      const original = node.data;
      const end = offset + original.length;
      let updated = original;
      for (let i = edits.length - 1; i >= 0; i -= 1) {
        const edit = edits[i];
        if (edit.start >= end || edit.end <= offset) continue;
        const startInNode = Math.max(edit.start, offset) - offset;
        const endInNode = Math.min(edit.end, end) - offset;
        const replacement = edit.start >= offset ? NBSP : '';
        updated = updated.slice(0, startInNode) + replacement + updated.slice(endInNode);
      }
      if (updated !== original) node.data = updated;
      offset = end;
    }
    nodes = [];
  }

  function visit(node) {
    if (node.nodeType === 3) {
      nodes.push(node);
      return;
    }
    const tag = node.tagName?.toUpperCase();
    if (SKIP_CONTENT.has(tag)) {
      flush();
      return;
    }
    const boundary = FLOW_BOUNDARIES.has(tag);
    if (boundary) flush();
    for (const child of node.childNodes ?? []) visit(child);
    if (boundary) flush();
  }

  if (root) visit(root);
  flush();
}
