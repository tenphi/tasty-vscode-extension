/**
 * Test Layout.stories.tsx highlighting
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
  
  // Read Layout.stories.tsx
  const filePath = '/Users/tenphi/Projects/cube/ui-kit/src/components/content/Layout/Layout.stories.tsx';
  
  if (!fs.existsSync(filePath)) {
    console.log('Layout.stories.tsx not found at:', filePath);
    return;
  }
  
  const code = fs.readFileSync(filePath, 'utf8');
  const lines = code.split('\n');
  
  console.log('=== LAYOUT.STORIES.TSX TEST ===\n');
  console.log('Testing lines 1150-1230 for highlighting issues...\n');

  let ruleStack = vsctm.INITIAL;
  
  // Process all lines to build up rule stack state
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const result = grammar.tokenizeLine(line, ruleStack);
    ruleStack = result.ruleStack;
    
    // Only output lines 1150-1230
    if (i >= 1149 && i <= 1229) {
      const lineNum = i + 1;
      const tokens = result.tokens;
      
      // Check for problematic patterns
      let hasTastyIssue = false;
      let problemTokens = [];
      
      for (const token of tokens) {
        const text = line.substring(token.startIndex, token.endIndex);
        const scopes = token.scopes.join(' | ');
        const hasTasty = scopes.includes('tasty');
        
        // Check for style props that should have tasty
        if (/^(gap|fill|align|padding|preset|color|radius|border|flow|width|height)$/.test(text.trim())) {
          if (!hasTasty) {
            hasTastyIssue = true;
            problemTokens.push({ text: text.trim(), issue: 'missing tasty', scopes });
          }
        }
        
        // Check for plain text that shouldn't have tasty (inside JSX text content)
        if (scopes.includes('meta.jsx.children') && !scopes.includes('meta.tag')) {
          if (hasTasty && text.trim() && !/^[<>{}]$/.test(text.trim())) {
            hasTastyIssue = true;
            problemTokens.push({ text: text.trim(), issue: 'unwanted tasty in plain text', scopes });
          }
        }
      }
      
      if (hasTastyIssue) {
        console.log(`Line ${lineNum}: ${line.trim().substring(0, 60)}...`);
        for (const pt of problemTokens) {
          console.log(`  ❌ "${pt.text}" - ${pt.issue}`);
          console.log(`     Scopes: ${pt.scopes.substring(0, 100)}...`);
        }
        console.log();
      }
    }
  }
  
  console.log('Done. Only problematic lines were shown.');
}

main().catch(console.error);
