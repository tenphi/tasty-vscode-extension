# Tasty Syntax Highlighting for VS Code

A VS Code extension that provides syntax highlighting for [Tasty](https://github.com/tenphi/tasty) CSS-in-JS styles in TypeScript, TSX, JavaScript, and JSX files.

**Targets `@tenphi/tasty` v3.** At-rule keys use the CSS at-rule spelling (`@property`, `@font-face`, `@counter-style`, `@function`) and `$$name(...)` CSS-function calls are highlighted as calls. The v2 camelCase spellings (`@properties`, `@fontFace`, `@counterStyle`) are no longer recognized as at-rules — for tasty v2, pin `cube-dev.tasty-syntax-highlighting@^3`.

## Install

Download the `.vsix` asset from the [latest GitHub release](https://github.com/tenphi/tasty-vscode-extension/releases/latest).
In VS Code, run **Extensions: Install from VSIX…** and select that file, or use:

```sh
code --install-extension tasty-syntax-highlighting-4.1.0.vsix
```

Builds are distributed through GitHub Releases. Marketplace publishing is not enabled.

## Features

The extension injects a TextMate grammar that highlights Tasty-specific syntax elements inside style objects:

- **Color tokens** — `#primary`, `#purple.5`, `#danger`
- **Custom properties** — `$gap`, `$radius`, `$$property-ref`
- **Custom units** — `2x`, `1r`, `1.5bw`, `3cr`
- **Typography presets** — `h1`, `t2`, `t3 / strong`, `italic`
- **State keys** — `:hover`, `hovered`, `@mobile`, `@media(w < 768px)`, `@parent(hovered, >)`
- **Logical operators** — `&`, `|`, `^`, `!`
- **At-rule keys** — `@keyframes`, `@property`, `@font-face`, `@counter-style`, `@function`, `@starting`
- **CSS `@function` calls** — `$$negative(10px)`, `$$shadow(#accent)`
- **CSS functions** — `rgb()`, `calc()`, `url()`, etc.
- **Style property names** — `fill`, `radius`, `flow`, `preset`, etc.
- **Modifiers** — `top`, `bottom-right`, `dock`, `longhand`, `leaf`, `thin`

### Supported contexts

The grammar recognizes Tasty styles in:

- `styles: { ... }` object properties, including `tasty({ styles: ... })`
- Direct `useStyles({ ... })`, `useGlobalStyles(selector, { ... })`, and `tastyStatic({ ... })` calls, including the selector and extension overloads
- Inline JSX `styles={{ ... }}` literals; references such as `styles={cardStyles}` keep normal JavaScript highlighting
- Object properties whose name ends in `Styles` (`overlayStyles: { ... }`)
- Variables ending with `Styles` or `Tokens`
- Variables typed as `Styles` or `Tasty.Styles`, including literals starting on the next line
- Single-line `const card = { ... } satisfies Styles` declarations

TextMate grammars cannot resolve import aliases or infer a multiline object's type
from a later `satisfies Styles`. Use an explicit `Styles` annotation or a variable
name ending in `Styles` for those objects. Unrelated strings, comments, and regex
literals retain their normal highlighting.

### Snippets

Available in TypeScript, TSX, JavaScript, and JSX:

| Prefix            | Inserts                                |
| ----------------- | -------------------------------------- |
| `tasty-component` | A component with a `styles` object     |
| `tasty-static`    | A `tastyStatic()` style definition     |
| `tasty-state-map` | Default and conditional style values   |
| `tasty-configure` | Shared state aliases and design tokens |

Add the corresponding Tasty imports before using a snippet.

## Validation & Linting

For style validation, use the **[@tenphi/eslint-plugin-tasty](https://www.npmjs.com/package/@tenphi/eslint-plugin-tasty)** ESLint plugin. It covers property validation, value syntax checking, token existence, state key validation, and best practices enforcement — all runnable in your editor and CI. It also auto-fixes the v2 at-rule key spellings, so `eslint --fix` handles most of a v3 upgrade.

## Autocomplete

Tasty provides augmentable TypeScript interfaces for IDE autocomplete without a language server. Add a declaration file to your project (e.g. `tasty.d.ts`):

```typescript
import '@tenphi/tasty';

declare module '@tenphi/tasty' {
  interface TastyNamedColors {
    primary: true;
    danger: true;
    surface: true;
  }

  interface TastyPresetNames {
    h1: true;
    h2: true;
    t1: true;
    t2: true;
    t3: true;
  }

  interface TastyThemeNames {
    danger: true;
    success: true;
  }
}
```

This gives you autocomplete for `fill`, `color`, `svgFill` (color tokens), `preset` (preset names), and the `theme` prop — powered by TypeScript itself, working in any editor.

## License

MIT
