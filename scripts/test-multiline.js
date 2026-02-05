/**
 * Test multi-line tokenization
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
  
  // Multi-line test case
  const code = `const StylePropsShowcase = () => (
  <>
    {/* Component style props - SHOULD be highlighted */}
    <FlexContainer
      gap="2x"
      align="center"
      justify="space-between"
      fill="#surface"
      padding="3x 4x"
      radius="1r"
      border="1bw solid #border"
      width="max 800px"
      height="min 200px"
      onClick={() => {}}
      className="wrapper"
    >
      Content
    </FlexContainer>

    {/* Object notation for style props */}
    <Button
      fill={{
        '': '#primary',
        'hovered': '#primary.8',
        'pressed': '#primary.6',
      }}
      color="#white"
      padding="2x 4x"
    />

    {/* Multiple style props on same line */}
    <Box gap="1x" flow="row" align="start" />
  </>
);`;

  console.log('=== MULTI-LINE TOKENIZATION TEST ===\n');

  let ruleStack = vsctm.INITIAL;
  const lines = code.split('\n');
  
  const relevantTokens = ['gap', 'align', 'fill', 'padding', 'radius', 'border', 'width', 'height', 'justify', 'color', 'flow', '2x', '1x', 'center', '#primary', '#surface', '#white', '#border', 'hovered', 'pressed', 'FlexContainer', 'Button', 'Box'];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const result = grammar.tokenizeLine(line, ruleStack);
    ruleStack = result.ruleStack;
    
    let lineHasTasty = false;
    const lineTokens = [];
    
    for (const token of result.tokens) {
      const text = line.substring(token.startIndex, token.endIndex);
      const scopes = token.scopes.join(' | ');
      const hasTasty = scopes.includes('tasty');
      
      if (hasTasty) lineHasTasty = true;
      
      if (relevantTokens.some(t => text.includes(t))) {
        lineTokens.push({ text, hasTasty, scopes });
      }
    }
    
    if (lineTokens.length > 0) {
      console.log(`Line ${i + 1}: ${line.trim()}`);
      for (const t of lineTokens) {
        console.log(`  "${t.text}" ${t.hasTasty ? '✓ TASTY' : '✗ no tasty'}`);
        if (!t.hasTasty) {
          console.log(`    Scopes: ${t.scopes}`);
        }
      }
      console.log();
    }
  }
}

main().catch(console.error);
