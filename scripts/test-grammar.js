/**
 * Test script to verify TextMate grammar tokenization
 * Uses vscode-textmate to tokenize test files and verify highlighting
 */

const fs = require('fs');
const path = require('path');

// Try to use vscode-textmate for accurate tokenization
async function main() {
  let vsctm, oniguruma;
  
  try {
    vsctm = require('vscode-textmate');
    oniguruma = require('vscode-oniguruma');
  } catch (e) {
    console.log('Required packages not installed. Installing...');
    const { execSync } = require('child_process');
    execSync('npm install vscode-textmate vscode-oniguruma', { stdio: 'inherit' });
    vsctm = require('vscode-textmate');
    oniguruma = require('vscode-oniguruma');
  }

  // Load the oniguruma WASM
  const wasmBin = fs.readFileSync(
    path.join(__dirname, '../node_modules/vscode-oniguruma/release/onig.wasm')
  ).buffer;
  
  await oniguruma.loadWASM(wasmBin);

  // Load the TSX grammar from VS Code's built-in grammars
  const tsxGrammarPath = findTsxGrammar();
  if (!tsxGrammarPath) {
    console.error('Could not find TSX grammar. Using fallback test mode.');
    runFallbackTest();
    return;
  }

  // Load our tasty grammar
  const tastyGrammarPath = path.join(__dirname, '../syntaxes/tasty.tmLanguage.json');
  const tastyGrammar = JSON.parse(fs.readFileSync(tastyGrammarPath, 'utf8'));
  const tsxGrammar = JSON.parse(fs.readFileSync(tsxGrammarPath, 'utf8'));

  console.log('Loaded grammars:');
  console.log('  - TSX:', tsxGrammarPath);
  console.log('  - Tasty:', tastyGrammarPath);
  console.log();
  console.log('Tasty injectionSelector:', tastyGrammar.injectionSelector);
  console.log();

  // Create a registry
  const registry = new vsctm.Registry({
    onigLib: Promise.resolve({
      createOnigScanner: (patterns) => new oniguruma.OnigScanner(patterns),
      createOnigString: (s) => new oniguruma.OnigString(s),
    }),
    loadGrammar: async (scopeName) => {
      if (scopeName === 'source.tsx') {
        return vsctm.parseRawGrammar(JSON.stringify(tsxGrammar), tsxGrammarPath);
      }
      if (scopeName === 'source.tasty') {
        return vsctm.parseRawGrammar(JSON.stringify(tastyGrammar), tastyGrammarPath);
      }
      // Load other grammars if needed
      return null;
    }
  });

  // Load the TSX grammar with tasty injection
  const grammar = await registry.loadGrammar('source.tsx');
  
  if (!grammar) {
    console.error('Failed to load grammar');
    return;
  }

  // Test cases
  const testCases = [
    {
      name: 'Style prop with string value',
      code: '<FlexContainer gap="2x" align="center" />'
    },
    {
      name: 'Style prop with object value', 
      code: `<Button fill={{ '': '#primary', 'hovered': '#primary.8' }} />`
    },
    {
      name: 'styles={{ ... }} prop',
      code: `<PaywallButton styles={{ position: 'absolute', right: '1px' }} />`
    },
    {
      name: 'Multiple style props',
      code: '<Text preset="t3" color="#dark-02" />'
    },
    {
      name: 'tasty() call with styles',
      code: `const Button = tasty({ styles: { fill: '#primary', color: '#white' } });`
    },
    {
      name: 'Variable ending with Styles',
      code: `const buttonStyles = { fill: '#primary', padding: '2x' };`
    },
    {
      name: 'styles: { ... } property',
      code: `const config = { styles: { fill: '#primary' }, other: 'value' };`
    }
  ];

  console.log('=== TOKENIZATION TESTS ===\n');

  for (const testCase of testCases) {
    console.log(`Test: ${testCase.name}`);
    console.log(`Code: ${testCase.code}`);
    console.log('Tokens:');
    
    let ruleStack = vsctm.INITIAL;
    const lines = testCase.code.split('\n');
    
    for (const line of lines) {
      const result = grammar.tokenizeLine(line, ruleStack);
      ruleStack = result.ruleStack;
      
      for (const token of result.tokens) {
        const text = line.substring(token.startIndex, token.endIndex);
        const scopes = token.scopes.join(' ');
        const hasTasty = scopes.includes('tasty');
        console.log(`  [${token.startIndex}-${token.endIndex}] "${text}" ${hasTasty ? '✓ TASTY' : ''}`);
        console.log(`    Scopes: ${scopes}`);
      }
    }
    console.log();
  }
}

function findTsxGrammar() {
  // Try common locations
  const possiblePaths = [
    // VS Code built-in extensions
    '/Applications/Visual Studio Code.app/Contents/Resources/app/extensions/typescript-basics/syntaxes/TypeScriptReact.tmLanguage.json',
    '/Applications/Cursor.app/Contents/Resources/app/extensions/typescript-basics/syntaxes/TypeScriptReact.tmLanguage.json',
    // User's VS Code extensions
    `${process.env.HOME}/.vscode/extensions`,
    // NPM package
    path.join(__dirname, '../node_modules/typescript-basics/syntaxes/TypeScriptReact.tmLanguage.json'),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      if (p.endsWith('.json')) {
        return p;
      }
      // Search in directory
      const tsxGrammar = findInDir(p, 'TypeScriptReact.tmLanguage.json');
      if (tsxGrammar) return tsxGrammar;
    }
  }
  
  return null;
}

function findInDir(dir, filename) {
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        const found = findInDir(fullPath, filename);
        if (found) return found;
      } else if (file === filename) {
        return fullPath;
      }
    }
  } catch (e) {
    // Ignore permission errors
  }
  return null;
}

function runFallbackTest() {
  console.log('=== FALLBACK: Grammar Structure Analysis ===\n');
  
  const grammarPath = path.join(__dirname, '../syntaxes/tasty.tmLanguage.json');
  const grammar = JSON.parse(fs.readFileSync(grammarPath, 'utf8'));
  
  console.log('scopeName:', grammar.scopeName);
  console.log('injectionSelector:', grammar.injectionSelector);
  console.log();
  
  console.log('Top-level patterns:');
  for (const pattern of grammar.patterns) {
    console.log('  -', pattern.include || pattern.name || pattern.match || 'anonymous pattern');
  }
  console.log();
  
  console.log('Repository entries:');
  for (const [name, entry] of Object.entries(grammar.repository)) {
    const desc = entry.comment || entry.name || (entry.patterns ? `${entry.patterns.length} patterns` : 'pattern');
    console.log(`  - ${name}: ${desc}`);
  }
  
  // Check jsx-component-style-props specifically
  console.log('\n=== jsx-component-style-props patterns ===');
  const jcsProps = grammar.repository['jsx-component-style-props'];
  if (jcsProps && jcsProps.patterns) {
    for (const pattern of jcsProps.patterns) {
      console.log(`  ${pattern.comment || pattern.name || 'pattern'}`);
      if (pattern.begin) console.log(`    begin: ${pattern.begin}`);
      if (pattern.end) console.log(`    end: ${pattern.end}`);
    }
  }
  
  // Check tasty-jsx-component
  console.log('\n=== meta.tasty-jsx-component.tsx pattern ===');
  const tastyStyles = grammar.repository['tasty-styles'];
  if (tastyStyles && tastyStyles.patterns) {
    const jsxComp = tastyStyles.patterns.find(p => p.name === 'meta.tasty-jsx-component.tsx');
    if (jsxComp) {
      console.log('  begin:', jsxComp.begin);
      console.log('  end:', jsxComp.end);
      console.log('  patterns:', jsxComp.patterns?.map(p => p.include || p.match || p.name).join(', '));
    }
  }
}

main().catch(console.error);
