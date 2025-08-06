const fs = require('fs');
const path = require('path');

// Test our grammar patterns directly
function testPatterns() {
  console.log('🧪 Testing Tasty Grammar Patterns...\n');

  // Load our grammar
  const grammarPath = path.join(__dirname, 'syntaxes/tasty.tmLanguage.json');
  const grammar = JSON.parse(fs.readFileSync(grammarPath, 'utf8'));

  // Test cases
  const testCases = [
    {
      name: 'Basic styles pattern',
      input: 'styles: {',
      shouldMatch: true,
      pattern: 'tasty-styles'
    },
    {
      name: 'InputStyles pattern',
      input: 'inputStyles: {',
      shouldMatch: true,
      pattern: 'tasty-styles'
    },
    {
      name: 'ButtonStyles pattern', 
      input: 'buttonStyles: {',
      shouldMatch: true,
      pattern: 'tasty-styles'
    },
    {
      name: 'Non-styles pattern',
      input: 'padding: {',
      shouldMatch: false,
      pattern: 'tasty-styles'
    },
    {
      name: 'Object property pattern',
      input: 'padding: ',
      shouldMatch: true,
      pattern: 'tasty-object-property'
    },
    {
      name: 'Quoted state key pattern',
      input: "'!disabled & hovered': ",
      shouldMatch: true,
      pattern: 'tasty-object-property'
    },
    // NEW: Variable declaration patterns
    {
      name: 'const styles variable',
      input: 'const styles = {',
      shouldMatch: true,
      pattern: 'tasty-styles'
    },
    {
      name: 'const INPUT_STYLES variable',
      input: 'const INPUT_STYLES = {',
      shouldMatch: true,
      pattern: 'tasty-styles'
    },
    {
      name: 'let buttonStyles variable',
      input: 'let buttonStyles = {',
      shouldMatch: true,
      pattern: 'tasty-styles'
    },
    {
      name: 'var cardStyles variable',
      input: 'var cardStyles = {',
      shouldMatch: true,
      pattern: 'tasty-styles'
    },
    {
      name: 'const HEADER_STYLES variable',
      input: 'const HEADER_STYLES = {',
      shouldMatch: true,
      pattern: 'tasty-styles'
    },
    {
      name: 'Variable not ending with styles',
      input: 'const config = {',
      shouldMatch: false,
      pattern: 'tasty-styles'
    },
    {
      name: 'Property with styles in middle',
      input: 'const stylesConfig = {',
      shouldMatch: false,
      pattern: 'tasty-styles'
    },
    {
      name: 'Plain object should not match',
      input: 'const plainObject = {',
      shouldMatch: false,
      pattern: 'tasty-styles'
    },
    {
      name: 'Regular const assignment should not match',
      input: 'const config = {',
      shouldMatch: false,
      pattern: 'tasty-styles'
    }
  ];

  let allPassed = true;

  for (const testCase of testCases) {
    console.log(`Testing: ${testCase.name}`);
    console.log(`Input: "${testCase.input}"`);
    
    // Get the pattern from the grammar
    const pattern = findPattern(grammar, testCase.pattern);
    if (!pattern) {
      console.log(`  ❌ FAIL: Pattern '${testCase.pattern}' not found in grammar`);
      allPassed = false;
      continue;
    }

    // Test if the input matches the pattern
    const matches = testRegexPattern(pattern, testCase.input);
    
    if (testCase.shouldMatch && !matches) {
      console.log(`  ❌ FAIL: Should match but doesn't`);
      allPassed = false;
    } else if (!testCase.shouldMatch && matches) {
      console.log(`  ❌ FAIL: Should not match but does`);
      allPassed = false;
    } else {
      console.log(`  ✅ PASS: ${matches ? 'Matches' : 'Does not match'} as expected`);
    }
    console.log();
  }

  // Test boundary conditions
  console.log('🔬 Testing Boundary Conditions...\n');
  
  const boundaryTests = [
    {
      name: 'Styles object should end at closing brace',
      input: 'styles: { padding: "2x" }',
      pattern: 'tasty-styles'
    }
  ];

  for (const test of boundaryTests) {
    console.log(`Testing: ${test.name}`);
    console.log(`Input: "${test.input}"`);
    
    const pattern = findPattern(grammar, test.pattern);
    if (!pattern) {
      console.log(`  ❌ FAIL: Pattern '${test.pattern}' not found`);
      allPassed = false;
      continue;
    }

    // Find the main styles pattern (not the inline one)
    const mainPattern = pattern.patterns.find(p => p.name === 'meta.tasty-styles.tsx');
    if (!mainPattern) {
      console.log(`  ❌ FAIL: Main tasty-styles pattern not found`);
      allPassed = false;
      continue;
    }

    // Test the begin and end patterns
    const beginRegex = extractRegex(mainPattern.begin);
    const endRegex = extractRegex(mainPattern.end);
    
    console.log(`  Begin pattern: ${beginRegex}`);
    console.log(`  End pattern: ${endRegex}`);
    
    if (beginRegex && endRegex) {
      const beginMatch = new RegExp(beginRegex).test(test.input);
      console.log(`  Begin matches: ${beginMatch ? '✅' : '❌'}`);
      
      if (beginMatch) {
        // Find where the begin pattern ends and test the end pattern
        const match = test.input.match(new RegExp(beginRegex));
        if (match) {
          const afterBegin = test.input.substring(match.index + match[0].length);
          const endMatch = new RegExp(endRegex).test(afterBegin);
          console.log(`  End pattern found in remaining text: ${endMatch ? '✅' : '❌'}`);
        }
      }
    }
    console.log();
  }

  if (allPassed) {
    console.log('✅ ALL PATTERN TESTS PASSED!');
  } else {
    console.log('❌ SOME PATTERN TESTS FAILED!');
    process.exit(1);
  }
}

function findPattern(grammar, patternName) {
  return grammar.repository[patternName];
}

function testRegexPattern(pattern, input) {
  if (!pattern || !pattern.patterns) {
    return false;
  }
  
  // For tasty-styles, only test the main pattern (not the inline one)
  const patternsToTest = pattern.patterns.filter(p => 
    p.name !== 'meta.tasty-styles.inline.tsx'
  );
  
  // Test relevant sub-patterns
  for (const subPattern of patternsToTest) {
    if (subPattern.begin) {
      try {
        const regex = new RegExp(subPattern.begin);
        if (regex.test(input)) {
          return true;
        }
      } catch (e) {
        console.log(`    Warning: Invalid regex pattern: ${subPattern.begin}`);
      }
    }
    if (subPattern.match) {
      try {
        const regex = new RegExp(subPattern.match);
        if (regex.test(input)) {
          return true;
        }
      } catch (e) {
        console.log(`    Warning: Invalid regex pattern: ${subPattern.match}`);
      }
    }
  }
  
  return false;
}

function extractRegex(pattern) {
  return pattern;
}

testPatterns();