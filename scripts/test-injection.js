/**
 * Test script to verify TextMate grammar injection is working
 */

const fs = require('fs');
const path = require('path');

async function main() {
  const vsctm = require('vscode-textmate');
  const oniguruma = require('vscode-oniguruma');

  // Load the oniguruma WASM
  const wasmBin = fs.readFileSync(
    path.join(__dirname, '../node_modules/vscode-oniguruma/release/onig.wasm')
  ).buffer;
  
  await oniguruma.loadWASM(wasmBin);

  // Load grammars
  const tsxGrammarPath = '/Applications/Visual Studio Code.app/Contents/Resources/app/extensions/typescript-basics/syntaxes/TypeScriptReact.tmLanguage.json';
  const tastyGrammarPath = path.join(__dirname, '../syntaxes/tasty.tmLanguage.json');
  
  const tsxGrammarRaw = JSON.parse(fs.readFileSync(tsxGrammarPath, 'utf8'));
  const tastyGrammarRaw = JSON.parse(fs.readFileSync(tastyGrammarPath, 'utf8'));

  console.log('Tasty grammar injectionSelector:', tastyGrammarRaw.injectionSelector);
  console.log();

  // Create a registry that properly handles injections
  const grammars = new Map();
  grammars.set('source.tsx', tsxGrammarRaw);
  grammars.set('source.tasty', tastyGrammarRaw);
  
  // Also load TypeScript for nested includes
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
      console.log(`Loading grammar: ${scopeName}`);
      const raw = grammars.get(scopeName);
      if (raw) {
        return vsctm.parseRawGrammar(JSON.stringify(raw), `${scopeName}.json`);
      }
      return null;
    },
    getInjections: (scopeName) => {
      // Tell vscode-textmate that source.tasty injects into source.tsx
      if (scopeName === 'source.tsx' || scopeName === 'source.ts') {
        console.log(`Getting injections for ${scopeName}: source.tasty`);
        return ['source.tasty'];
      }
      return undefined;
    }
  });

  // Load the TSX grammar (injections should be applied automatically)
  console.log('\nLoading TSX grammar with injections...');
  const grammar = await registry.loadGrammar('source.tsx');
  
  if (!grammar) {
    console.error('Failed to load grammar');
    return;
  }

  // Test cases
  const testCases = [
    '<FlexContainer gap="2x" align="center" />',
    `<Button fill={{ '': '#primary', 'hovered': '#primary.8' }} />`,
    `<PaywallButton styles={{ position: 'absolute' }} />`,
    `const buttonStyles = { fill: '#primary', padding: '2x' };`,
    `tasty({ styles: { fill: '#primary' } })`,
  ];

  console.log('\n=== TOKENIZATION WITH INJECTION ===\n');

  for (const code of testCases) {
    console.log(`Code: ${code}`);
    
    let ruleStack = vsctm.INITIAL;
    const result = grammar.tokenizeLine(code, ruleStack);
    
    let foundTasty = false;
    for (const token of result.tokens) {
      const text = code.substring(token.startIndex, token.endIndex);
      const scopes = token.scopes.join(' | ');
      const hasTasty = scopes.includes('tasty');
      if (hasTasty) foundTasty = true;
      
      // Only show tokens that might be relevant
      if (hasTasty || text.match(/^(gap|fill|align|styles|buttonStyles|\#|2x|center|primary)$/i)) {
        console.log(`  "${text}" ${hasTasty ? '✓ TASTY' : ''}`);
        console.log(`    ${scopes}`);
      }
    }
    
    if (!foundTasty) {
      console.log('  ⚠️ No tasty scopes found');
    }
    console.log();
  }
}

main().catch(console.error);
