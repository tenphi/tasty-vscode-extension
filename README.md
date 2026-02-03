# Tasty Syntax Highlighting for VSCode

A VSCode extension that provides syntax highlighting, validation, and autocomplete for [Tasty](https://github.com/cube-js/cube-ui-kit) CSS-in-JS styles.

> **Version**: 2.0.x - Complete rewrite using Language Server Protocol (LSP) for context-aware highlighting and validation.

## Features

- **Syntax Highlighting**: Color tokens, custom properties, units, presets, and state modifiers are highlighted with semantic meaning
- **Validation & Diagnostics**: Real-time validation against your project's `tasty.config.ts` file
- **Autocomplete**: Context-aware suggestions for properties, tokens, presets, and states
- **Hover Information**: Detailed information about tokens, units, and properties on hover
- **Config File Support**: Hierarchical configuration with `tasty.config.ts` files
- **Package Extension**: Extend configs from npm packages (e.g., `@cube-dev/ui-kit`)

## Supported Syntax

### `tasty()` Function

```typescript
const Button = tasty({
  styles: {
    padding: '2x 4x',      // Custom units
    fill: '#purple',       // Color tokens
    color: '#white',
    radius: '1r',          // Radius unit
    preset: 't3 strong',   // Typography presets
  },
  variants: {
    primary: {
      fill: '#primary',
    },
  },
});
```

### `tastyStatic()` Function

```typescript
// Single styles object
const card = tastyStatic({
  padding: '4x',
  fill: '#surface',
});

// Extending a base style
const primaryCard = tastyStatic(card, {
  fill: '#purple',
});

// Selector mode (global styles)
tastyStatic('body', {
  fill: '#dark-bg',
  preset: 't3',
});
```

### State-Based Styles

```typescript
const button = tasty({
  styles: {
    fill: {
      '': '#white',           // Default
      'hovered': '#gray.05',  // Boolean modifier
      ':focus': '#purple.1',  // Pseudo-class
      '@mobile': '#light',    // State alias
      '@media(w < 768px)': '#surface',  // Media query
    },
  },
});
```

## Configuration

Create a `tasty.config.ts` file in your project root (or any directory) to enable validation and improve autocomplete:

```typescript
export default {
  // Color and custom property tokens
  tokens: [
    '#primary', '#secondary', '#danger', '#success',
    '#dark', '#light', '#white', '#black',
    '$gap', '$radius', '$card-padding',
  ],

  // Custom units (built-in: x, r, cr, bw, ow, fs, lh, sf)
  units: ['cols', 'rows'],

  // State aliases for responsive/theme variants
  states: ['@mobile', '@tablet', '@desktop', '@dark', '@light'],

  // Typography presets
  presets: ['h1', 'h2', 'h3', 't1', 't2', 't3', 'tag'],

  // Descriptions for hover information
  tokenDescriptions: {
    '#primary': 'Primary brand color',
    '$gap': 'Base spacing unit for layouts',
  },

  presetDescriptions: {
    'h1': 'Main page heading (32px, bold)',
  },

  stateDescriptions: {
    '@mobile': 'Mobile viewport (width < 768px)',
    '@dark': 'Dark theme mode',
  },
};
```

### Extending from Packages

If you're using `@cube-dev/ui-kit`, you can extend its configuration to inherit all tokens, presets, and states:

```typescript
export default {
  // Extend from the UI Kit package
  extends: '@cube-dev/ui-kit',

  // Add project-specific tokens
  tokens: [
    '#brand-primary',
    '#brand-secondary',
    '$custom-spacing',
  ],

  // Add project-specific states
  states: ['@desktop', '@print'],

  // Add descriptions for your custom tokens
  tokenDescriptions: {
    '#brand-primary': 'Primary brand color for this project',
  },
};
```

The `extends` field supports:
- **Relative paths**: `'../shared/tasty.config.ts'`
- **Package names**: `'@cube-dev/ui-kit'` (looks for `tasty.config.ts` in the package root)

### Local Definitions

The extension automatically detects tokens and state aliases defined locally in your files:

```typescript
const Component = tasty({
  styles: {
    // Token definitions - no config needed!
    '$side-padding': '2x',
    '#custom-color': '#purple',
    '@hover': ':hover',  // Local state alias
    
    // Token usages - recognized from local definitions
    padding: '0 $side-padding',
    fill: '#custom-color',
    color: { '': '#text', '@hover': '#purple' },
  },
});
```

Local definitions:
- Are excluded from "unknown token" warnings
- Appear in autocomplete suggestions (marked as "local")
- Show "Defined locally in this file" on hover

### Config Hierarchy

The extension supports hierarchical configs in monorepos:

```
workspace/
├── tasty.config.ts          # Root config (may extend @cube-dev/ui-kit)
├── packages/
│   ├── dashboard/
│   │   ├── tasty.config.ts  # Dashboard-specific tokens
│   │   └── src/
│   └── marketing/
│       ├── tasty.config.ts  # Marketing-specific tokens
│       └── src/
```

**Merge rules:**
- Configs are merged from root to leaf, with closer configs taking precedence
- Arrays (tokens, presets, states) are combined and deduplicated
- `false` value disables validation for that category (tokens, units, funcs)
- Extended configs (via `extends`) are merged first, then local values override

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `tasty.enable` | `true` | Enable/disable the extension |
| `tasty.enableSemanticHighlighting` | `true` | Enable semantic syntax highlighting |
| `tasty.enableDiagnostics` | `true` | Enable validation and diagnostics |
| `tasty.enableAutoComplete` | `true` | Enable autocomplete suggestions |
| `tasty.hoverPreview` | `true` | Show hover information |
| `tasty.configPath` | `""` | Path to config file (auto-detect if empty) |
| `tasty.trace.server` | `"off"` | LSP trace level for debugging |

## Commands

| Command | Description |
|---------|-------------|
| `Tasty: Restart Language Server` | Restart the language server (useful after config changes) |
| `Tasty: Show Current Configuration` | Display the resolved config for the current file |

## Development

### Building

```bash
# Install dependencies (root + client + server)
npm install
cd client && npm install && cd ..
cd server && npm install && cd ..

# Build all packages
npm run build

# Watch mode (for development)
npm run watch
```

### Testing

```bash
# Run parser tests (tastyParser + stateParser)
npm run test:all

# Run grammar tests only
npm run test:grammar

# Run pattern tests only
npm run test:patterns
```

Unit tests are located in `test/` directory:
- `tastyParser.test.ts` - Tests for style value tokenization
- `stateParser.test.ts` - Tests for state key parsing

### Debugging

1. Open the extension folder in VSCode
2. Press F5 to launch the Extension Development Host
3. Use "Attach to Server" launch configuration to debug the language server
4. Set `tasty.trace.server` to `"verbose"` for detailed LSP communication logs

## Architecture

The extension uses the Language Server Protocol (LSP) for:

- **Semantic Tokens**: AST-aware syntax highlighting
- **Diagnostics**: Real-time validation
- **Completions**: Context-aware autocomplete
- **Hover**: Token and property documentation

```
┌─────────────────────────────────────────┐
│           VSCode Extension              │
│  ┌─────────────────────────────────┐   │
│  │     Language Client (client/)   │   │
│  └─────────────┬───────────────────┘   │
└────────────────┼────────────────────────┘
                 │ LSP (JSON-RPC)
                 ▼
┌─────────────────────────────────────────┐
│         Language Server (server/)       │
│  ┌─────────────────────────────────┐   │
│  │  TypeScript Parser + Tasty AST  │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │      Config Resolver/Loader     │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

## Requirements

- VSCode 1.74.0 or higher
- Node.js 20.18.1 or higher (for development)

## Related

- [Tasty Documentation](https://github.com/cube-js/cube-ui-kit) - The Tasty style helper library
- [@cube-dev/ui-kit](https://www.npmjs.com/package/@cube-dev/ui-kit) - The full UI Kit package

## License

MIT
