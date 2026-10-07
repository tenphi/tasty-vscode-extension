import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import textmate from 'vscode-textmate';
import oniguruma from 'vscode-oniguruma';

const require = createRequire(import.meta.url);
await oniguruma.loadWASM(
  readFileSync(require.resolve('vscode-oniguruma/release/onig.wasm')),
);

const hosts = new Map([
  ['source.ts', 'TypeScript'],
  ['source.tsx', 'TypeScriptReact'],
  ['source.js', 'JavaScript'],
  ['source.js.jsx', 'JavaScriptReact'],
]);
const manifest = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
);
/** @type {string[]} */
const targets = manifest.contributes.grammars[0].injectTo;
const registry = new textmate.Registry({
  onigLib: Promise.resolve({
    createOnigScanner: (patterns) => new oniguruma.OnigScanner(patterns),
    createOnigString: (value) => new oniguruma.OnigString(value),
  }),
  loadGrammar: async (scope) => {
    const path =
      scope === 'source.tasty'
        ? new URL('../syntaxes/tasty.tmLanguage.json', import.meta.url)
        : hosts.has(scope)
          ? new URL(
              `./grammars/${hosts.get(scope)}.tmLanguage.json`,
              import.meta.url,
            )
          : null;
    return path
      ? textmate.parseRawGrammar(readFileSync(path, 'utf8'), path.pathname)
      : null;
  },
  // VS Code collects injections registered for each prefix of a host scope.
  getInjections: (scope) =>
    targets.some((target) => scope === target || scope.startsWith(`${target}.`))
      ? ['source.tasty']
      : [],
});

/**
 * @param {string} source
 * @param {string} [scope]
 */
export async function tokenize(source, scope = 'source.tsx') {
  const grammar = await registry.loadGrammar(scope);
  assert.ok(grammar, `Unknown host grammar: ${scope}`);
  let stack = textmate.INITIAL;
  let offset = 0;
  return source.split('\n').flatMap((line) => {
    const result = grammar.tokenizeLine(line, stack, 1000);
    assert.equal(result.stoppedEarly, false, 'Tokenizer must finish each line');
    stack = result.ruleStack;
    const tokens = result.tokens.map((token) => ({
      start: offset + token.startIndex,
      end: offset + Math.min(token.endIndex, line.length),
      text: line.slice(token.startIndex, token.endIndex),
      scopes: token.scopes,
    }));
    offset += line.length + 1;
    return tokens;
  });
}

/**
 * @param {Awaited<ReturnType<typeof tokenize>>} tokens
 * @param {string} source
 * @param {string} needle
 */
export function tokenFor(tokens, source, needle) {
  const start = source.indexOf(needle);
  assert.notEqual(start, -1, `Missing probe ${needle}`);
  const token = tokens.find(
    (item) => item.start <= start && item.end >= start + needle.length,
  );
  assert.ok(
    token,
    `Split or missing token ${needle}: ${JSON.stringify(tokens)}`,
  );
  return token;
}
