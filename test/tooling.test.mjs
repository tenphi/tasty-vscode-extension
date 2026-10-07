import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);

test('the shell-quote security override preserves launch-editor command parsing', () => {
  /** @type {(editor: string) => string[]} */
  const guessEditor = require(require.resolve('launch-editor/guess'));
  assert.deepEqual(guessEditor('code --wait "file with spaces.tsx"'), [
    'code',
    '--wait',
    'file with spaces.tsx',
  ]);
  assert.deepEqual(
    guessEditor('"/Applications/Visual Studio Code.app/code" --new-window'),
    ['/Applications/Visual Studio Code.app/code', '--new-window'],
  );
});
