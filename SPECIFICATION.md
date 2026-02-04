# Tasty VSCode Extension Specification

## Overview

This document specifies the Tasty VSCode extension, which provides language features for the `tasty()` and `tastyStatic()` CSS-in-JS style system.

**Package**: `tasty-syntax-highlighting`

**Features**:
- Syntax highlighting via TextMate grammar (injected into TypeScript/TSX)
- Validation driven by `tasty.config.ts` files
- Autocomplete for properties, tokens, units, presets, and states
- Hover information for style properties and tokens

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    VSCode Extension                      │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │   Client    │  │   Commands   │  │  Configuration │ │
│  └──────┬──────┘  └──────────────┘  └────────────────┘ │
└─────────┼───────────────────────────────────────────────┘
          │ LSP (JSON-RPC)
          ▼
┌─────────────────────────────────────────────────────────┐
│                   Language Server                        │
│  ┌─────────────────┐  ┌──────────────────────────────┐ │
│  │  TS Compiler    │  │     Tasty Syntax Parsers     │ │
│  │  (detect types) │  │  (tokenize style values)     │ │
│  └────────┬────────┘  └───────────────┬──────────────┘ │
│           │                           │                 │
│           ▼                           ▼                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Semantic Token Provider             │   │
│  │              Completion Provider                 │   │
│  │              Hover Provider                      │   │
│  │              Diagnostics Provider                │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
tasty-vscode-extension/
├── client/
│   ├── src/
│   │   └── extension.ts          # VSCode extension client
│   └── package.json
├── server/
│   ├── src/
│   │   ├── server.ts             # LSP server entry
│   │   ├── tastyParser.ts        # Tasty value tokenizer
│   │   ├── stateParser.ts        # State key tokenizer
│   │   ├── contextDetector.ts    # Styles context detection
│   │   ├── contextResolver.ts    # Position context resolution
│   │   ├── sourceFileCache.ts    # TS SourceFile caching
│   │   ├── config/
│   │   │   ├── index.ts          # Config exports
│   │   │   ├── loader.ts         # Load & parse config files
│   │   │   └── resolver.ts       # Resolve config hierarchy
│   │   ├── semanticTokens.ts     # Semantic token provider
│   │   ├── completion.ts         # Autocomplete provider
│   │   ├── hover.ts              # Hover information
│   │   ├── diagnostics.ts        # Validation & errors
│   │   └── builtins.ts           # Built-in properties, units, etc.
│   └── package.json
├── shared/
│   └── src/
│       ├── types.ts              # Shared types
│       ├── configTypes.ts        # Config type definitions
│       └── index.ts
├── test/
│   ├── tastyParser.test.ts       # Value parser tests
│   └── stateParser.test.ts       # State parser tests
└── package.json                  # Root package
```

---

## Context Detection

The extension detects Tasty style contexts using two mechanisms:

### LSP Context Detection (TypeScript AST)

Used for validation, autocomplete, and hover:

| Strategy | Description | Example |
|----------|-------------|---------|
| `tasty()` call | Detects styles, variants, tokens properties | `tasty({ styles: {...} })` |
| `tastyStatic()` call | Single arg, base extension, or selector mode | `tastyStatic({ ... })` |
| Styles type annotation | Variables with `Styles` type (handles `as const`) | `const x: Styles = {...} as const` |
| `styles` prop | JSX styles prop | `<Component styles={{...}} />` |
| Heuristic | Variables ending with `*styles/*Styles/*STYLES` or `*tokens/*Tokens/*TOKENS` | `const buttonStyles = {...}` |

### TextMate Grammar Detection

Used for syntax highlighting (regex-based injection into TypeScript/TSX):

| Pattern | Description | Example |
|---------|-------------|---------|
| `{{ ... }}` | JSX inline styles | `styles={{ padding: '2x' }}` |
| `styles: { ... }` | Property assignment | `{ styles: { padding: '2x' } }` |
| `*Styles/*STYLES = { ... }` | Variable with Styles suffix | `const cardStyles = { ... }` |
| `*Tokens/*TOKENS = { ... }` | Variable with Tokens suffix | `const BASE_TOKENS = { ... }` |
| `: Styles = { ... }` | Explicit Styles type annotation | `const x: Styles = { ... }` |
| `export const ... = { ... }` | Supports optional `export` prefix | `export const STYLES = { ... }` |
| `<Component prop="value">` | JSX component style props | `<Flex gap="2x" fill="#surface">` |

**Note**: TextMate patterns support `as const` suffix and type annotations like `: Styles`.

### JSX Component Style Props

Style props on React components (capitalized names) are automatically highlighted when:

1. The component name starts with uppercase (e.g., `FlexContainer`, not `div`)
2. The prop name is a known style property
3. The value is a string literal or object notation `{{ ... }}`

**Supported style properties:**
- **Base**: `display`, `font`, `preset`, `hide`, `whiteSpace`, `opacity`, `transition`
- **Position**: `gridArea`, `order`, `gridColumn`, `gridRow`, `placeSelf`, `alignSelf`, `justifySelf`, `zIndex`, `margin`, `inset`, `position`
- **Block**: `reset`, `padding`, `paddingInline`, `paddingBlock`, `overflow`, `scrollbar`, `textAlign`, `border`, `radius`, `shadow`, `outline`
- **Color**: `color`, `fill`, `fade`, `image`
- **Text**: `textTransform`, `fontWeight`, `fontStyle`
- **Dimension**: `width`, `height`, `flexBasis`, `flexGrow`, `flexShrink`, `flex`
- **Flow**: `flow`, `placeItems`, `placeContent`, `alignItems`, `alignContent`, `justifyItems`, `justifyContent`, `align`, `justify`, `gap`, `columnGap`, `rowGap`, `gridColumns`, `gridRows`, `gridTemplate`, `gridAreas`

**Example:**
```tsx
<FlexContainer
  gap="2x"              // Highlighted - gap is a style prop
  align="center"        // Highlighted - align is a style prop
  fill="#surface"       // Highlighted - fill is a style prop
  onClick={handleClick} // Not highlighted - onClick is not a style prop
>
```

---

## Syntax Highlighting

| Feature | Example |
|---------|---------|
| Style properties | `padding`, `fill`, `radius` |
| Color tokens | `#primary`, `#purple.5`, `#current` |
| Hex colors | `#fff`, `#aabbcc` |
| Custom properties | `$spacing`, `$$token`, `##color` |
| Custom units | `2x`, `1r`, `1bw` |
| CSS units | `16px`, `1.5em`, `100%` |
| Boolean modifiers | `hovered`, `pressed`, `disabled` |
| Value modifiers | `theme=dark`, `size="large"` |
| Pseudo-classes | `:hover`, `:focus-visible` |
| Pseudo-class functions | `:has(> Icon)`, `:nth-of-type(odd)`, `:is(.a, .b)` |
| Class selectors | `.active`, `.special` |
| Attribute selectors | `[disabled]`, `[aria-expanded="true"]` |
| Logical operators | `&`, `\|`, `!`, `^` |
| Advanced states | `@media(...)`, `@root(...)`, `@(...)` |
| Sub-elements | `Title`, `Content` (capitalized keys) |
| At-rules | `@keyframes`, `@properties` |
| Presets | `h1`, `t2` (from config) |
| Preset modifiers | `strong`, `italic`, `tight` |
| Directions | `top`, `left`, `bottom right` |
| Functions | `calc()`, `rgb()`, `url()` |

---

## Validation

| Check | Severity | Condition |
|-------|----------|-----------|
| Unknown token | Warning | When `tokens` defined in config AND not defined locally |
| Unknown unit | Warning | When `units` defined in config |
| Unknown preset | Warning | When `presets` defined in config |
| Unknown state alias | Warning | When `@alias` used but not in config or defined locally |
| Invalid state key syntax | Error | Always |
| `@own()` outside sub-element | Warning | When `@own(...)` is used at root level |

**Note**: Style property names are **not validated** because Tasty supports all CSS properties plus custom style handlers. Maintaining a complete list of valid CSS properties would be impractical and would require constant updates as CSS evolves.

### Special Structures

The following are handled specially during validation:

- **`@keyframes`**: Contains animation keyframe objects with percentage keys (`0%`, `100%`) - these are not validated as state keys
- **`@properties`**: Contains CSS `@property` definitions - skipped from normal style validation
- **`&`-prefixed keys**: CSS selector affixes (`&::before`, `& > div`) - recursively validated as nested style objects

### Local Definitions

The extension automatically scans the current file for locally-defined tokens and states. This allows you to define project-specific tokens and states inline without adding them to `tasty.config.ts`.

#### Local Tokens

Properties starting with `$` or `#` defined in style objects are recognized as local token definitions:

```typescript
const Component = tasty({
  styles: {
    // Token definitions (key = definition)
    '$side-padding': '2x',
    '$computed-size': '(100% - 2 * $gap)',
    '#custom-color': {
      '': '#purple',
      'hovered': '#purple.8',
    },
    
    // Token usages - no warnings because they're defined above
    padding: '0 $side-padding',
    fill: '#custom-color',
    width: '$computed-size',
  },
});
```

Tokens defined inside nested structures (`&`-prefixed selector affixes, capitalized sub-elements, `@`-prefixed at-rules) are also collected:

```typescript
const Component = tasty({
  styles: {
    '&::before': {
      '$inner-radius': '(4 / 100 * $size)',  // Defined inside &::before
      radius: '$inner-radius',                // Usage - no warning
    },
  },
});
```

#### Local State Aliases

State aliases are recognized as definitions when they are property keys with `@` prefix and a string literal value:

```typescript
const Component = tasty({
  styles: {
    // State alias definition - maps @state to :hover
    '@state': ':hover',
    '@active': '.active',
    
    // Using the local state alias - no warning
    fill: {
      '': '#white',
      '@state': '#gray',    // Valid - @state is defined above
      '@active': '#purple', // Valid - @active is defined above
    },
  },
});
```

**Important**: State aliases used in mapping keys are **usages**, not definitions:

```typescript
const Component = tasty({
  styles: {
    '@state': ':hover',  // This is a DEFINITION
    
    '$size': {
      '': '16px',
      '@state': '20px',     // This is a USAGE of @state - valid
      '@state2': '24px',    // WARNING: @state2 is not defined!
    },
  },
});
```

#### What Counts as a Definition

| Pattern | Type | Example |
|---------|------|---------|
| `'$name': value` | Token definition | `'$gap': '8px'` |
| `'#name': value` | Token definition | `'#accent': '#purple'` |
| `'@name': 'string'` | State alias definition | `'@hover': ':hover'` |

#### What Does NOT Count as a Definition

| Pattern | Type | Example |
|---------|------|---------|
| `prop: '$name'` | Token usage | `padding: '$gap'` |
| `'state \| @name': value` | State alias usage | `'hovered \| @active': '#red'` |
| `'@keyframes': {...}` | Special structure (skipped) | Animation definitions |
| `'@properties': {...}` | Special structure (skipped) | CSS @property rules |

Local definitions are:
- Excluded from "unknown token" and "unknown state alias" warnings
- Included in autocomplete suggestions (marked as "local")
- Shown in hover information as "Defined locally in this file"

---

## Autocomplete

- Style property names (built-in Tasty properties)
- Color tokens (`#primary`, etc. from config)
- Custom properties (`$spacing`, etc. from config)
- Preset names (from config)
- Preset modifiers (`strong`, `italic`, `icon`, `tight`)
- State aliases (`@mobile`, etc. from config)
- Directional modifiers (`top`, `right`, `bottom`, `left`)
- Units (built-in + from config)

---

## Hover Information

Hover provides information for:
- Style property names (Tasty-specific properties identified as built-in)
- Token definitions (color tokens, custom properties) with descriptions from config
- Unit descriptions (built-in or custom)
- Preset information with descriptions from config
- State aliases with definitions from config
- Special selectors like `:has()` with Tasty-specific behavior explained

Token, preset, and state descriptions can be provided via the `tokenDescriptions`, `presetDescriptions`, and `stateDescriptions` fields in the config file.

**Note**: Property descriptions are derived from TypeScript types in the Tasty core library (`StylesInterface`). The extension does not maintain separate descriptions for CSS properties. If more detailed property descriptions are needed, they should be added to the Tasty library's TypeScript types as JSDoc comments.

---

## Configuration

### VSCode Settings

```jsonc
{
  "tasty.enable": true,
  "tasty.enableSemanticHighlighting": true,
  "tasty.enableDiagnostics": true,
  "tasty.enableAutoComplete": true,
  "tasty.hoverPreview": true,
  "tasty.configPath": "",  // Path to config (default: auto-detect)
  "tasty.trace.server": "off"  // "off" | "messages" | "verbose"
}
```

### Project Config (`tasty.config.ts`)

```typescript
export default {
  // Extend from @cube-dev/ui-kit or a relative path
  extends: '@cube-dev/ui-kit',

  // Valid token names (# for colors, $ for properties)
  tokens: ['#primary', '#danger', '$spacing', '$gap'],

  // Valid unit names (built-in: x, r, cr, bw, ow, fs, lh, sf)
  units: ['cols', 'rows'],

  // Valid function names
  funcs: ['clamp', 'double'],

  // State alias names (must start with @)
  states: ['@mobile', '@tablet', '@dark'],

  // Valid preset names (project-specific, no built-in presets)
  presets: ['h1', 'h2', 'h3', 't1', 't2', 't3'],

  // Descriptions for hover information
  tokenDescriptions: {
    '#primary': 'Primary brand color',
    '#danger': 'Error and destructive action color',
    '$spacing': 'Base spacing unit for layouts',
  },

  presetDescriptions: {
    'h1': 'Main page heading (32px, bold)',
    't1': 'Large body text (18px)',
  },

  stateDescriptions: {
    '@mobile': 'Mobile viewport (width < 768px)',
    '@dark': 'Dark theme mode',
  },
};
```

### Config Fields

| Field | Type | Description |
|-------|------|-------------|
| `extends` | `string` | Path to parent config file or npm package name |
| `tokens` | `string[] \| false` | Valid token names (`#color`, `$prop`). `false` disables validation |
| `units` | `string[] \| false` | Valid custom unit names. `false` disables validation |
| `funcs` | `string[] \| false` | Valid function names. `false` disables validation |
| `states` | `string[]` | State alias names (must start with `@`) |
| `presets` | `string[]` | Valid preset names for `preset` property |
| `tokenDescriptions` | `Record<string, string>` | Descriptions for tokens (shown on hover) |
| `presetDescriptions` | `Record<string, string>` | Descriptions for presets (shown on hover) |
| `stateDescriptions` | `Record<string, string>` | Descriptions for state aliases (shown on hover) |

### Extending from Packages

The `extends` field supports both relative paths and npm package names:

```typescript
// Relative path
extends: '../shared/tasty.config.ts'

// Package name (looks for tasty.config.ts in package root)
extends: '@cube-dev/ui-kit'
```

When extending from a package:
1. The resolver uses Node's module resolution to find the package
2. Looks for `tasty.config.ts`, `tasty.config.js`, or `tasty.config.mjs` in the package root
3. The extended config is loaded and merged first, then local values override

### Config Hierarchy

The extension automatically merges configs from the directory hierarchy:

```
workspace-root/
├── tasty.config.ts              # Root config
├── packages/
│   ├── dashboard/
│   │   ├── tasty.config.ts      # Dashboard-specific (extends root)
│   │   └── src/Chart.tsx        # Uses merged config
```

Merge rules:
- Arrays are combined and deduplicated
- `false` value disables validation for that category
- Closer configs override root configs

---

## Built-in Defaults

### Units

Always available: `x`, `r`, `cr`, `bw`, `ow`, `fs`, `lh`, `sf`

### Preset Modifiers

Always available: `strong`, `italic`, `icon`, `tight`

### Direction Modifiers

`top`, `right`, `bottom`, `left`, `inline`, `block`, `start`, `end`

### Style Properties

All Tasty properties including:
- **Layout**: `display`, `flow`, `gap`, `padding`, `margin`, `width`, `height`
- **Visual**: `fill`, `color`, `border`, `radius`, `shadow`, `outline`
- **Typography**: `preset`, `font`, `textAlign`, `fontWeight`
- **Grid**: `gridColumns`, `gridRows`, `gridTemplate`, `gridArea`
- **Alignment**: `align`, `justify`, `place`, `alignItems`
- **Position**: `position`, `inset`, `zIndex`, `order`
- **Other**: `overflow`, `transition`, `animation`, `transform`, `cursor`
- **Special**: `@keyframes`, `@properties`, `$` (selector affix)

---

## Caching Strategy

The extension uses multiple caching layers for performance:

1. **Source File Cache** (`sourceFileCache.ts`)
   - Caches TypeScript `SourceFile` objects per document
   - Caches detected style contexts
   - Invalidated on document change

2. **Config Cache** (`config/resolver.ts`)
   - Caches loaded config files
   - Caches merged configs per directory
   - Invalidated on config file change (via file watcher)

3. **Document Settings Cache** (`server.ts`)
   - Caches VSCode settings per document
   - Invalidated on configuration change

---

## Known Limitations

### TextMate vs Semantic Tokens

The extension uses **TextMate grammar** for syntax highlighting instead of LSP semantic tokens because:

1. **TypeScript LS conflict**: VSCode's built-in TypeScript language server emits semantic tokens that conflict with ours
2. **TextMate injection**: Works reliably without conflicts via `L:source.tsx` injection
3. **Trade-offs**: No AST context, regex-based patterns, but works across all editor states

### Autocomplete Limitations

1. **Tokens with hyphens**: Tokens like `#surface-hover` may not autocomplete correctly due to VSCode's word boundary handling
2. **`$` prefix**: Not recognized as part of word by VSCode's default word pattern
3. **Workarounds**: `textEdit`, `filterText`, and `commitCharacters` help but VSCode still applies word-boundary pre-filtering

### Diagnostics Refresh

When `tasty.config.ts` changes, diagnostics are recomputed but **VSCode may not refresh the editor display** until the file is edited.

**Workaround**: Make a small edit in the affected file.

### Pseudo-Class Function Highlighting

Pseudo-class functions like `:has()`, `:is()`, `:where()`, `:not()`, and `:nth-of-type()` are parsed with proper tokenization of their inner content:

| Part | Highlighting | Example |
|------|-------------|---------|
| Colon | Punctuation | `:` in `:has()` |
| Function name | Pseudo-class name | `has`, `nth-of-type` |
| Parentheses | Punctuation | `(`, `)` |
| Combinators | Operator | `>`, `+`, `~` |
| Sub-elements | Type name | `Icon`, `Prefix` (capitalized) |
| Class selectors | Class name | `.active`, `.highlighted` |
| Element tags | Tag name | `div`, `span` |
| Numeric expressions | Numeric | `odd`, `even`, `2n+1` |

Example: `:has(> Icon)` is highlighted as:
- `:` - punctuation
- `has` - pseudo-class name
- `(` - punctuation
- `>` - combinator operator
- `Icon` - sub-element type name
- `)` - punctuation

### Token Highlighting

Token prefixes are unified for consistent highlighting:

| Syntax | Purpose | Highlighting |
|--------|---------|--------------|
| `$name` | Custom property value | Variable color |
| `$$name` | Custom property name | Variable color |
| `#name` | Color token value | Color token color |
| `##name` | Color token name | Color token color |

### Reserved Color Tokens

| Token | Description |
|-------|-------------|
| `#current` | Maps to CSS `currentcolor`, supports opacity: `#current.5` |

---

## Development

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

### Watch

```bash
npm run watch
```

### Package VSIX

```bash
npm version patch  # Increment version
npm run build:vsix
```
