// Test injection selector and pattern matching for JSX

const fs = require('fs');
const path = require('path');

function testInjection() {
  console.log('🧪 Testing Injection Selector and Pattern Matching...\n');

  // Load our grammar
  const grammarPath = path.join(__dirname, 'syntaxes/tasty.tmLanguage.json');
  const grammar = JSON.parse(fs.readFileSync(grammarPath, 'utf8'));

  console.log('📋 Injection Selector:', grammar.injectionSelector);
  console.log();

  // Test injection selector targets
  const injectionTargets = grammar.injectionSelector.split(',').map(s => s.trim());
  console.log('🎯 Injection Targets:');
  injectionTargets.forEach(target => {
    console.log(`  ✅ ${target}`);
  });
  console.log();

  // Test specific scope combinations
  const testScopes = [
    {
      name: 'TSX source file',
      scopes: ['source.tsx'],
      shouldMatch: true
    },
    {
      name: 'JSX embedded expression',
      scopes: ['source.tsx', 'meta.embedded.expression.tsx'],
      shouldMatch: true
    },
    {
      name: 'Object literal in TSX',
      scopes: ['source.tsx', 'meta.object-literal.tsx'],
      shouldMatch: true
    },
    {
      name: 'Comment (should not match)',
      scopes: ['source.tsx', 'comment.block'],
      shouldMatch: false
    },
    {
      name: 'String (should not match)',
      scopes: ['source.tsx', 'string.quoted.double'],
      shouldMatch: false
    }
  ];

  console.log('🔍 Testing Scope Matching:');
  let allScopeTestsPassed = true;

  testScopes.forEach(test => {
    // Simple check if any injection target would match these scopes
    const wouldMatch = injectionTargets.some(target => {
      const targetParts = target.split(' ');
      const mainTarget = targetParts[0].replace('L:', '');
      const exclusions = targetParts.slice(1).map(p => p.replace('-', ''));
      
      const hasMainScope = test.scopes.some(scope => scope.includes(mainTarget.split('.')[0]));
      const hasExclusion = test.scopes.some(scope => 
        exclusions.some(excl => scope.includes(excl))
      );
      
      return hasMainScope && !hasExclusion;
    });

    if (wouldMatch === test.shouldMatch) {
      console.log(`  ✅ ${test.name} → ${wouldMatch ? 'Would inject' : 'Would not inject'}`);
    } else {
      console.log(`  ❌ ${test.name} → Expected ${test.shouldMatch ? 'injection' : 'no injection'}, got ${wouldMatch ? 'injection' : 'no injection'}`);
      allScopeTestsPassed = false;
    }
  });
  console.log();

  // Test pattern matching
  console.log('🎯 Testing Pattern Matching:');
  const testPatterns = [
    {
      name: 'Regular styles object',
      input: 'styles: {',
      context: 'Normal TSX file',
      shouldMatch: true
    },
    {
      name: 'JSX inputStyles with double braces',
      input: 'inputStyles={{',
      context: 'JSX embedded expression',
      shouldMatch: true
    },
    {
      name: 'JSX buttonStyles with space',
      input: 'buttonStyles={ {',
      context: 'JSX embedded expression', 
      shouldMatch: true
    },
    {
      name: 'Non-styles property',
      input: 'className={{',
      context: 'JSX embedded expression',
      shouldMatch: false
    }
  ];

  // Find the main styles pattern (not the inline one)
  const mainStylesPattern = grammar.repository['tasty-styles'].patterns.find(p => 
    p.name === 'meta.tasty-styles.tsx'
  );
  const regex = new RegExp(mainStylesPattern.begin);

  let allPatternTestsPassed = true;

  testPatterns.forEach(test => {
    const matches = regex.test(test.input);
    
    if (matches === test.shouldMatch) {
      console.log(`  ✅ ${test.name} → ${matches ? 'Matches' : 'No match'}`);
    } else {
      console.log(`  ❌ ${test.name} → Expected ${test.shouldMatch ? 'match' : 'no match'}, got ${matches ? 'match' : 'no match'}`);
      allPatternTestsPassed = false;
    }
  });
  console.log();

  // Overall result
  if (allScopeTestsPassed && allPatternTestsPassed) {
    console.log('✅ INJECTION TEST PASSED: All patterns and scopes work correctly!');
    console.log('🚀 The extension should work in VS Code with proper injection.');
  } else {
    console.log('❌ INJECTION TEST FAILED: Some patterns or scopes need fixing.');
    process.exit(1);
  }
}

testInjection();