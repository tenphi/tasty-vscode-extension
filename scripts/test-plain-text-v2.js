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
  
  // Test ONLY plain text in JSX
  const code = `const Example = () => (
  <div>
    This is plain text with code snippets.
    Press Escape to close this panel.
    The dimmed color indicates disabled state.
    Use the & operator for AND logic.
  </div>
);`;

  console.log('=== PLAIN TEXT IN JSX TEST ===\n');
  console.log('Checking lines 3-6 for tasty scopes (should have NONE):\n');

  let ruleStack = vsctm.INITIAL;
  const lines = code.split('\n');
  
  let foundTastyInPlainText = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const result = grammar.tokenizeLine(line, ruleStack);
    ruleStack = result.ruleStack;
    
    // Only check lines 3-6 (indexes 2-5) which contain plain text
    if (i >= 2 && i <= 5) {
      console.log(`Line ${i + 1}: "${line.trim()}"`);
      
      for (const token of result.tokens) {
        const text = line.substring(token.startIndex, token.endIndex);
        const scopes = token.scopes.join(' | ');
        const hasTasty = scopes.includes('tasty');
        
        if (hasTasty && text.trim()) {
          console.log(`  ❌ "${text.trim()}" has tasty scope: ${scopes}`);
          foundTastyInPlainText = true;
        }
      }
    }
  }
  
  if (!foundTastyInPlainText) {
    console.log('\n✓ SUCCESS: No tasty scopes found in plain text!');
  } else {
    console.log('\n❌ FAILURE: Plain text incorrectly has tasty scopes');
  }
}

main().catch(console.error);
