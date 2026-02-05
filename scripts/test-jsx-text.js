/**
 * Test JSX text content scopes
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

  // Test WITHOUT injection
  console.log('=== TEST WITHOUT TASTY INJECTION ===\n');
  {
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
      }
      // No getInjections - pure TSX grammar
    });

    const grammar = await registry.loadGrammar('source.tsx');
    
    const code = `const Story = {
  render: () => (
    <Card>
      <Text preset="t3" color="#dark-02">
        This content stays in place when the sticky panel opens. Compare
        this with the default panel mode where content is pushed aside.
      </Text>
    </Card>
  )
};`;

    let ruleStack = vsctm.INITIAL;
    const lines = code.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const result = grammar.tokenizeLine(line, ruleStack);
      ruleStack = result.ruleStack;
      
      // Check specific words
      for (const token of result.tokens) {
        const text = line.substring(token.startIndex, token.endIndex).trim();
        const scopes = token.scopes.join(' | ');
        
        if (['opens', 'this', 'should', 'code', 'stays', 'place', 'content'].includes(text)) {
          console.log(`Line ${i + 1}: "${text}"`);
          console.log(`  Scopes: ${scopes}\n`);
        }
      }
    }
  }

  // Test WITH injection
  console.log('\n=== TEST WITH TASTY INJECTION ===\n');
  {
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
    
    const code = `const Story = {
  render: () => (
    <Card>
      <Text preset="t3" color="#dark-02">
        This content stays in place when the sticky panel opens. Compare
        this with the default panel mode where content is pushed aside.
      </Text>
    </Card>
  )
};`;

    let ruleStack = vsctm.INITIAL;
    const lines = code.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const result = grammar.tokenizeLine(line, ruleStack);
      ruleStack = result.ruleStack;
      
      // Check specific words
      for (const token of result.tokens) {
        const text = line.substring(token.startIndex, token.endIndex).trim();
        const scopes = token.scopes.join(' | ');
        
        if (['opens', 'this', 'should', 'code', 'stays', 'place', 'content'].includes(text)) {
          console.log(`Line ${i + 1}: "${text}"`);
          console.log(`  Scopes: ${scopes}\n`);
        }
      }
    }
  }
}

main().catch(console.error);
