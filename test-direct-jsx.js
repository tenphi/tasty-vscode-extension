// Test direct JSX injection without complex framework

const fs = require('fs');
const path = require('path');
const oniguruma = require('vscode-oniguruma');
const vsctm = require('vscode-textmate');

async function testDirectJSX() {
  console.log('🔍 Testing Direct JSX Injection...\n');

  // Initialize oniguruma
  const wasmBin = fs.readFileSync(path.join(__dirname, 'node_modules/vscode-oniguruma/release/onig.wasm')).buffer;
  const vscodeOnigurumaLib = oniguruma.loadWASM(wasmBin).then(() => {
    return {
      createOnigScanner(patterns) { return new oniguruma.OnigScanner(patterns); },
      createOnigString(s) { return new oniguruma.OnigString(s); }
    };
  });

  // Create registry
  const registry = new vsctm.Registry({
    onigLib: vscodeOnigurumaLib,
    loadGrammar: (scopeName) => {
      if (scopeName === 'source.tasty') {
        const grammarPath = path.join(__dirname, 'syntaxes/tasty.tmLanguage.json');
        const grammarContent = fs.readFileSync(grammarPath, 'utf8');
        return Promise.resolve(vsctm.parseRawGrammar(grammarContent, grammarPath));
      }
      return Promise.resolve(null);
    }
  });

  // Load Tasty grammar directly
  const grammar = await registry.loadGrammar('source.tasty');
  
  // Test JSX content directly
  const jsxContent = `inputStyles={{
  padding: '2x',
  fill: '#primary'
}}`;

  console.log('📝 Testing content:');
  console.log(jsxContent);
  console.log();

  let ruleStack = vsctm.INITIAL;
  const lines = jsxContent.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const result = grammar.tokenizeLine(line, ruleStack);
    ruleStack = result.ruleStack;

    console.log(`Line ${i + 1}: "${line}"`);
    for (const token of result.tokens) {
      const tokenText = line.substring(token.startIndex, token.endIndex);
      const scopes = token.scopes;
      
      const hasTastyScope = scopes.some(scope => 
        scope.includes('tasty') || 
        scope.includes('meta.tasty') ||
        scope.includes('meta.embedded.block.tasty')
      );
      
      const status = hasTastyScope ? '✅ TASTY' : '❌ NO TASTY';
      console.log(`  ${status}: "${tokenText}" → ${scopes.join(', ')}`);
    }
    console.log();
  }
}

testDirectJSX().catch(console.error);