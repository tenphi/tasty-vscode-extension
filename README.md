# Tasty Syntax Highlighting for VS Code

A VS Code extension that provides syntax highlighting for [Tasty](https://github.com/tenphi/tasty) CSS-in-JS styles in TypeScript, TSX, JavaScript, and JSX files.

## Features

The extension injects a TextMate grammar that highlights Tasty-specific syntax elements inside style objects:

- **Color tokens** — `#primary`, `#purple.5`, `#danger`
- **Custom properties** — `$gap`, `$radius`, `$$property-ref`
- **Custom units** — `2x`, `1r`, `1.5bw`, `3cr`
- **Typography presets** — `h1`, `t2`, `t3 strong`
- **State keys** — `:hover`, `hovered`, `@mobile`, `@media(w < 768px)`
- **Logical operators** — `&`, `|`, `^`, `!`
- **CSS functions** — `rgb()`, `calc()`, `url()`, etc.
- **Style property names** — `fill`, `radius`, `flow`, `preset`, etc.

### Supported contexts

The grammar recognizes Tasty styles in:

- `tasty()` and `tastyStatic()` function calls
- `styles: { ... }` and `variants: { ... }` object properties
- Variables ending with `Styles` or `Tokens`
- Variables typed as `Styles`
- JSX inline styles `{{ ... }}`
- JSX style props (`gap="2x"`, `fill="#primary"`)

## Validation & Linting

For style validation, use the **[@tenphi/tasty-eslint-plugin](https://www.npmjs.com/package/@tenphi/tasty-eslint-plugin)** ESLint plugin. It provides 27 rules covering property validation, value syntax checking, token existence, state key validation, and best practices enforcement — all runnable in your editor and CI.

## Autocomplete

Tasty provides augmentable TypeScript interfaces for IDE autocomplete without a language server. Add a declaration file to your project (e.g. `tasty.d.ts`):

```typescript
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
