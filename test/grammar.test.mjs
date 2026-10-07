import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { tokenize, tokenFor } from './tokenizer.mjs';

const hosts = ['source.ts', 'source.tsx', 'source.js', 'source.js.jsx'];
const color = 'entity.name.type.color.tasty-token';
const cases = [
  [
    'styles object',
    "tasty({ styles: { fill: '#primary' } });",
    '#primary',
    color,
  ],
  [
    'named variable',
    "const cardStyles = { fill: '#primary' };",
    '#primary',
    color,
  ],
  [
    'uppercase variable',
    "const CARD_STYLES = { fill: '#primary' };",
    '#primary',
    color,
  ],
  [
    'multiline variable',
    "const cardStyles =\n{ fill: '#primary' };",
    '#primary',
    color,
  ],
  [
    'multiline property',
    "tasty({ styles:\n{ fill: '#primary' } });",
    '#primary',
    color,
  ],
  ['useStyles', "useStyles({ fill: '#primary' });", '#primary', color],
  ['multiline call', "useStyles(\n{ fill: '#primary' }\n);", '#primary', color],
  ['tastyStatic', "tastyStatic({ fill: '#primary' });", '#primary', color],
  [
    'static selector',
    "tastyStatic('body', { fill: '#primary' });",
    '#primary',
    color,
  ],
  [
    'static extension',
    "tastyStatic(base, { fill: '#primary' });",
    '#primary',
    color,
  ],
  [
    'global styles',
    "useGlobalStyles(':root', { fill: '#primary' });",
    '#primary',
    color,
  ],
  [
    'class state',
    "const cardStyles = { fill: { '.x': '#primary' } };",
    '.x',
    'entity.name.tag.class.css',
  ],
  [
    'camelCase class',
    "const cardStyles = { fill: { '.isActive': '#primary' } };",
    '.isActive',
    'entity.name.tag.class.css',
  ],
  [
    'custom function',
    "const cardStyles = { padding: '$$negative(2x)' };",
    '$$negative',
    'support.function.custom-function.tasty',
  ],
  [
    'color function',
    "const cardStyles = { fill: '##derived(#primary)' };",
    '##derived',
    'support.function.custom-function.tasty',
  ],
  [
    'at-rule',
    "const cardStyles = { '@function': { '$$foo': {} } };",
    '@function',
    'keyword.control.at-rule.tasty',
  ],
  [
    'modern color',
    "const cardStyles = { fill: 'light-dark(#dark, #light)' };",
    'light-dark',
    'support.function.misc.css',
  ],
  [
    'contrast color',
    "const cardStyles = { fill: 'contrast-color(#dark)' };",
    'contrast-color',
    'support.function.misc.css',
  ],
  [
    'compound display',
    "const cardStyles = { display: 'inline-grid' };",
    'inline-grid',
    'support.constant.property-value.tasty-display',
  ],
  [
    'compound flow',
    "const cardStyles = { flow: 'row-reverse' };",
    'row-reverse',
    'support.constant.property-value.tasty-flex-flow',
  ],
  [
    'logical padding',
    "const cardStyles = { inlinePadding: '1x start, 2x end' };",
    '1x',
    'constant.numeric.custom-unit.tasty',
  ],
  [
    'hex letters',
    "const cardStyles = { fill: '#fff' };",
    '#fff',
    'constant.other.color.hex',
  ],
  [
    'hex digits',
    "const cardStyles = { fill: '#123' };",
    '#123',
    'constant.other.color.hex',
  ],
  [
    'escaped quote',
    String.raw`const cardStyles = { fontFamily: 'it\'s', fill: '#primary' };`,
    '#primary',
    color,
  ],
  [
    'escaped double quote',
    String.raw`const cardStyles = { content: "say \"hi\"", fill: '#primary' };`,
    '#primary',
    color,
  ],
  [
    'template interpolation',
    "const cardStyles = { padding: `${gap}x`, fill: '#primary' };",
    'gap',
    'variable.other.readwrite.tsx',
  ],
  [
    'URL',
    "const cardStyles = { image: 'url(https://example.com/a.png)', fill: '#primary' };",
    '#primary',
    color,
  ],
  [
    'array',
    "const cardStyles = { padding: ['1x', '2x'] };",
    '2x',
    'constant.numeric.custom-unit.tasty',
  ],
  [
    'boolean',
    'const cardStyles = { border: true };',
    'true',
    'constant.language.boolean.tasty',
  ],
];

for (const host of hosts) {
  for (const [name, source, needle, scope] of cases) {
    test(`${host}: ${name}`, async () => {
      const tokens = await tokenize(source, host);
      const token = tokenFor(tokens, source, needle);
      const expected = scope;
      assert.ok(
        token.scopes.includes(expected),
        `${needle}: ${token.scopes.join(' ')}`,
      );
    });
  }
  for (const [name, source] of [
    ['ordinary string', 'const message = "styles: { fill: \'#primary\' }";'],
    ['ordinary template', "const message = `styles: { fill: '#primary' }`;"],
    ['regex', "const re = /styles: { fill: '#primary' }/;"],
    ['comment', "// styles: { fill: '#primary' }"],
    ['unrelated object', "const options = { fill: '#primary' };"],
    ['unrelated method', "object.useStyles({ fill: '#primary' });"],
    ['reference options', "useStyles(cardStyles, { note: '#primary' });"],
    ['call options', "useStyles({ fill: '#accent' }, { note: '#primary' });"],
    [
      'satisfies in a string',
      `const options = { note: '} satisfies Styles', fill: '#primary' };`,
    ],
    [
      'satisfies in a sibling',
      `const options = { fill: '#primary' }, valid = { fill: '#accent' } satisfies Styles;`,
    ],
    [
      'satisfies in a comment',
      "const options = { /* } satisfies Styles */ fill: '#primary' };",
    ],
    [
      'satisfies in a regex',
      "const options = { re: /} satisfies Styles;/, fill: '#primary' };",
    ],
    [
      'unclosed initializer',
      "const cardStyles =\nother;\nconst options = { fill: '#primary' };",
    ],
  ]) {
    test(`${host}: preserve ${name}`, async () => {
      const sourceWithTail = `${source}\nconst ordinary = 1;`;
      const tokens = await tokenize(sourceWithTail, host);
      const token = tokenFor(tokens, sourceWithTail, '#primary');
      assert.ok(
        !token.scopes.some((scope) => scope.includes('tasty')),
        token.scopes.join(' '),
      );
      const tail = tokenFor(tokens, sourceWithTail, 'ordinary');
      assert.ok(
        !tail.scopes.some((scope) => scope.includes('tasty')),
        tail.scopes.join(' '),
      );
    });
  }
}

for (const host of ['source.ts', 'source.tsx']) {
  for (const source of [
    "const card: Styles = { fill: '#primary' };",
    "const card: Styles =\n{ fill: '#primary' };",
    "const card: Tasty.Styles = { fill: '#primary' };",
    "const card = { fill: '#primary' } satisfies Styles;",
    "const card = { fill: { '': '#primary' } } satisfies Styles;",
  ]) {
    test(`${host}: typed context ${source}`, async () => {
      assert.ok(
        tokenFor(
          await tokenize(source, host),
          source,
          '#primary',
        ).scopes.includes(color),
      );
    });
  }
}
for (const host of ['source.tsx', 'source.js.jsx']) {
  test(`${host}: JSX inline styles`, async () => {
    const source = "<Box styles={{ fill: '#primary' }} />;";
    assert.ok(
      tokenFor(
        await tokenize(source, host),
        source,
        '#primary',
      ).scopes.includes(color),
    );
  });
  test(`${host}: JSX references`, async () => {
    const source =
      '<Box styles={cardStyles} title="styles: { fill: #primary }" />;';
    const tokens = await tokenize(source, host);
    assert.ok(
      !tokenFor(tokens, source, '#primary').scopes.some((scope) =>
        scope.includes('tasty'),
      ),
    );
    assert.ok(
      !tokenFor(tokens, source, 'cardStyles').scopes.some((scope) =>
        scope.includes('tasty'),
      ),
    );
  });
  test(`${host}: multiline JSX literal`, async () => {
    const source = "<Box styles={\n{ fill: '#primary' }\n} />;";
    assert.ok(
      tokenFor(
        await tokenize(source, host),
        source,
        '#primary',
      ).scopes.includes(color),
    );
  });
}

test('all v3 at-rules and reserved references retain their scopes', async () => {
  for (const name of [
    'keyframes',
    'property',
    'font-face',
    'counter-style',
    'function',
    'starting',
  ]) {
    const source = `const cardStyles = { '@${name}': {} };`;
    assert.ok(
      tokenFor(await tokenize(source), source, `@${name}`).scopes.includes(
        'keyword.control.at-rule.tasty',
      ),
    );
  }
  for (const value of ['#current.07', '#primary.$opacity', '##primary']) {
    const source = `const cardStyles = { fill: '${value}' };`;
    assert.ok(
      tokenFor(await tokenize(source), source, value).scopes.some((scope) =>
        scope.startsWith(color),
      ),
    );
  }
});

test('template code preserves expressions while quoted text stays literal', async () => {
  const source =
    "const cardStyles = { padding: `${gap * 2}x`, content: '${literal}' };";
  const tokens = await tokenize(source);
  assert.ok(
    tokenFor(tokens, source, 'gap').scopes.includes(
      'variable.other.readwrite.tsx',
    ),
  );
  assert.ok(
    !tokenFor(tokens, source, 'literal').scopes.includes(
      'meta.template.expression.tsx',
    ),
  );
});

test('styles inside a native template expression are recognized', async () => {
  const source = "`value: ${useStyles({ fill: '#primary' })}`";
  assert.ok(
    tokenFor(await tokenize(source), source, '#primary').scopes.includes(color),
  );
});

test('large unfinished satisfies objects tokenize without backtracking stalls', async () => {
  const source = `const candidate = { ${"note: 'styles: { fill: #primary }', ".repeat(200)}\nconst ordinary = 1;`;
  const tokens = await tokenize(source);
  assert.ok(
    !tokenFor(tokens, source, 'ordinary').scopes.some((scope) =>
      scope.includes('tasty'),
    ),
  );
});

test('nested advanced queries keep their outer closing parenthesis', async () => {
  for (const query of [
    '@(layout, scroll-state(stuck: top))',
    '@supports($, :has(*))',
    '@supports(at-rule(@scope))',
  ]) {
    const source = `const cardStyles = { fill: { '${query}': '#primary' } };`;
    const tokens = await tokenize(source);
    const end = source.indexOf(query) + query.length - 1;
    const token = tokens.find((item) => item.start === end);
    assert.ok(
      token?.scopes.some((scope) =>
        /^punctuation.section.(container-query|advanced-state).end.tasty$/.test(
          scope,
        ),
      ),
      JSON.stringify(token),
    );
  }
});

test('invalid hex lengths are not highlighted as hex colors', async () => {
  for (const value of ['#12', '#12345', '#1234567', '#123456789']) {
    const source = `const cardStyles = { fill: '${value}' };`;
    const start = source.indexOf(value);
    const tokens = await tokenize(source);
    assert.ok(
      !tokens
        .filter(
          (token) => token.start < start + value.length && token.end > start,
        )
        .some((token) => token.scopes.includes('constant.other.color.hex')),
    );
  }
});

test('snippets and embedded language configuration are packaged consistently', () => {
  const pkg = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
  );
  assert.equal(pkg.engines.vscode, '^1.74.0');
  assert.equal(pkg.main, undefined);
  assert.equal(
    pkg.contributes.grammars[0].embeddedLanguages['meta.embedded.block.tasty'],
    'css',
  );
  for (const contribution of pkg.contributes.snippets) {
    const snippets = JSON.parse(
      readFileSync(new URL(`../${contribution.path}`, import.meta.url), 'utf8'),
    );
    assert.ok(Object.keys(snippets).length >= 4);
  }
});
