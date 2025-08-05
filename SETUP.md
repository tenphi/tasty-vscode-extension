# Tasty VS Code Extension - Setup Guide

## ✅ Extension Complete

The Tasty syntax highlighting VS Code extension has been successfully created and is ready for use.

## 📁 Project Structure

```
tasty-vscode-extension/
├── src/
│   └── extension.ts           # Main extension entry point
├── syntaxes/
│   └── tasty.tmLanguage.json # TextMate grammar for syntax highlighting
├── examples/
│   └── test-file.tsx         # Example file to test syntax highlighting
├── .vscode/                  # VS Code configuration
├── dist/                     # Compiled extension
├── package.json              # Extension manifest
├── README.md                 # User documentation
├── extension-guide.md        # Detailed guide
└── build-manual.js           # Alternative build script

```

## 🚀 Quick Start

### Method 1: Development Mode (Recommended)

1. Open this directory in VS Code
2. Press `F5` to launch Extension Development Host
3. In the new window, open a `.tsx` file
4. Test with Tasty styles

### Method 2: Manual Installation

```bash
# Copy to VS Code extensions directory
cp -r . ~/.vscode/extensions/tasty-syntax-highlighting

# Restart VS Code
```

## 🎨 Syntax Highlighting Features

The extension highlights Tasty syntax in these contexts:

- `styles` properties: `styles: { default: "color: $primary" }`
- Properties ending with `Styles`: `inputStyles="border: 1bw solid $border"`

### Supported Syntax

- **Design Tokens**: `#primary`, `#text`, `#surface`, `#border` with opacity `#primary.5`, `#danger.10`
- **Custom Units**: `2x` (gap), `1r` (radius), `1bw` (border-width), `1cr` (card-radius), `1sf` (stable-fraction)
- **Custom Properties**: `$variable`, `$(variable, fallback)`
- **Tasty Properties**: `fill`, `radius`, `preset`, `flow`, `gap`, `align`, `justify`, `fade`, `scrollbar`
- **Boolean Shortcuts**: `border: true`, `radius: true`
- **Typography Presets**: `h1`, `h2`, `t3`, `p1`, `c1`, etc.
- **State Modifiers**: `hovered`, `pressed`, `focused`, `disabled`, `[disabled]`
- **Directional Modifiers**: `top`, `right`, `bottom`, `left`
- **Shape Modifiers**: `round`, `ellipse`, `leaf`, `backleaf`
- **Responsive Arrays**: `['4x', '2x', '1x']`
- **State Objects**: `{ '': '#white', hovered: '#gray.05' }`
- **Dynamic State Logic**: Any identifier as state + logical operators `&` (AND), `|` (OR), `^` (XOR), `!` (NOT)
- **CSS Selectors**: `:hover`, `.class`, `[data-attr="value"]`, `:nth-child(2n+1)`
- **Complex Expressions**: `'!disabled & custom-state'`, `'(loading | processing) & !readonly'`
- **Comments**: `/* CSS comments */`

## 📝 Test Example

Create a `.tsx` file with this content to see the highlighting:

```tsx
import { tasty } from '@cube-dev/ui-kit';

const Button = tasty({
  as: 'button',
  styles: {
    padding: '2x 4x',
    fill: {
      '': '#primary',
      'hovered': '#primary.8',
      '[disabled]': '#gray'
    },
    color: '#white',
    radius: '1r',
    border: 'none',
    preset: 't3',
    transition: 'fill 0.2s'
  }
});

const Component = () => (
  <div inputStyles="border: 1bw solid #border; radius: 1r; fill: #white">
    Content
  </div>
);
```

## 🔧 Development Commands

- `npm run compile` - Compile extension
- `npm run watch` - Watch mode for development
- `npm run build:manual` - Verify build readiness
- `npm run build:vsix` - Create VSIX (requires Node.js 20+)

## ⚠️ Known Issues

- VSIX packaging requires Node.js 20+ due to dependencies
- For Node.js 18, use manual installation method

## ✅ Extension Ready

The extension is fully functional and ready for use. It provides comprehensive syntax highlighting for Tasty styles in TSX files following the Tasty parser specification.