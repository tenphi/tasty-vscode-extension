const fs = require('fs');
const path = require('path');

// Create a simple build script for when vsce has Node.js compatibility issues
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

console.log(`Building ${packageJson.name} v${packageJson.version}...`);

// List of files to include in the extension
const files = [
  'package.json',
  'README.md',
  'dist/extension.js',
  'dist/extension.js.map',
  'syntaxes/tasty.tmLanguage.json'
];

// Check if all required files exist
let allFilesExist = true;
files.forEach(file => {
  if (!fs.existsSync(file)) {
    console.error(`Error: Required file missing: ${file}`);
    allFilesExist = false;
  }
});

if (allFilesExist) {
  console.log('✅ All required files found');
  console.log('📦 Extension structure is ready');
  console.log('\nTo install manually:');
  console.log('1. Copy this directory to ~/.vscode/extensions/tasty-syntax-highlighting');
  console.log('2. Restart VS Code');
  console.log('\nOr press F5 in VS Code to test in development mode.');
} else {
  console.log('❌ Build failed - missing files');
  process.exit(1);
}