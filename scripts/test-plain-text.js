/**
 * Test plain text inside JSX is not incorrectly highlighted
 */

const fs = require('fs');
const path = require('path');

async function main() {
  const vsctm = require('vscode-textmate');
  const oniguruma = require('vscode-oniguruma');

  const wasmBin = fs.readFileSync(
    path.join(__dirname, '../node_modules/vscode-oniguruma/release/onig.wasm')
  ).buffer;
  
  await oniguruma.loadWASM(wasmBin);

  const tsxGrammarPath = '/Applications/Visual Studio Code.app/Contents/Resources/app/extensions/typescript-basics/syntaxes/TypeScriptReact.tmLanguage.json';
  const tastyGrammarPath = path.join(__dirname, '../syntaxes/tasty.tmLanguage.json');
  
  const tsxGrammarRaw = JSON.parse(fs.readFileSync(tsxGrammarPath, 'utf8'));
  const tastyGrammarRaw = JSON.parse(fs.readFileSync(tastyGrammarPath, 'utf8'));

  const grammars = new Map();
  grammars.set('source.tsx', tsxGrammarRaw);
  grammars.set('source.tasty', tastyGrammarRaw);
  
  const tsGrammarPath = '/Applications/Visual Studio Code.app/Contents/Resources/app/extensions/typescript-basics/syntaxes/TypeScript.tmLanguage.json';
  if (fs.existsSync(tsGrammarPath)) {
    grammars.set('source.ts', JSON.parse(fs.readFileSync(tsGrammarPath, 'utf8')));
  }

  const registry = new vsctm.Registry({
    onigLib: Promise.resolve({
      createOnigScanner: (patterns) => new oniguruma.OnigScanner(patterns),
      createOnigString: (s) => new oniguruma.OnigString(s),
    }),
    loadGrammar: async (scopeName) => {
      const raw = grammars.get(scopeName);
      if (raw) {
        return vsctm.parseRawGrammar(JSON.stringify(raw), `${scopeName}.json`);
      }
      return null;
    },
    getInjections: (scopeName) => {
      if (scopeName === 'source.tsx' || scopeName === 'source.ts') {
        return ['source.tasty'];
      }
      return undefined;
    }
  });

  const grammar = await registry.loadGrammar('source.tsx');
  
  // Test plain text in JSX - should NOT get tasty scopes
  const code = `const Example = () => (
  <div>
    This is plain text with code snippets.
    Press Escape to close this panel.
    The dimmed color indicates disabled state.
    Use the & operator for AND logic.
  </div>
);

// Text that SHOULD be highlighted in tasty
const buttonStyles = {
  fill: '#primary',
  color: '#white',
  padding: '2x 4x'
};`;

  console.log('=== PLAIN TEXT TEST ===\n');
  console.log('Plain text inside JSX should NOT have tasty scopes.\n');

  let ruleStack = vsctm.INITIAL;
  const lines = code.split('\n');
  
  // Words that should NOT have tasty scopes when they appear as plain text
  const plainTextWords = ['This', 'plain', 'text', 'code', 'snippets', 'Press', 'Escape', 'close', 'panel', 'dimmed', 'color', 'disabled', 'state', 'Use', 'operator', 'AND', 'logic'];
  // Words that SHOULD have tasty scopes
  const tastyWords = ['fill', 'padding', '#primary', '#white', '2x'];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const result = grammar.tokenizeLine(line, ruleStack);
    ruleStack = result.ruleStack;
    
    for (const token of result.tokens) {
      const text = line.substring(token.startIndex, token.endIndex).trim();
      const scopes = token.scopes.join(' | ');
      const hasTasty = scopes.includes('tasty');
      
      // Check plain text words - they should NOT have tasty scopes
      if (plainTextWords.some(w => text === w)) {
        if (hasTasty) {
          console.log(`❌ PROBLEM: Plain text "${text}" has tasty scope!`);
          console.log(`   Line ${i + 1}: ${line.trim()}`);
          console.log(`   Scopes: ${scopes}`);
        }
      }
      
      // Check tasty words - they SHOULD have tasty scopes  
      if (tastyWords.some(w => text === w || text.includes(w))) {
        if (hasTasty) {
          console.log(`✓ Good: "${text}" correctly has tasty scope`);
        } else {
          console.log(`⚠ WARNING: "${text}" should have tasty scope but doesn't`);
          console.log(`   Line ${i + 1}: ${line.trim()}`);
          console.log(`   Scopes: ${scopes}`);
        }
      }
    }
  }
  
  console.log('\nDone.');
}

main().catch(console.error);
