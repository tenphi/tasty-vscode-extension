# tasty-syntax-highlighting

## 4.1.0

### Minor Changes

- [#10](https://github.com/tenphi/tasty-vscode-extension/pull/10) [`df508cc`](https://github.com/tenphi/tasty-vscode-extension/commit/df508cca682fb504df0393a76f9b5f5a0a383ec3) Thanks [@tenphi](https://github.com/tenphi)! - Highlight direct `useStyles`, `useGlobalStyles`, and `tastyStatic` calls, inline JSX
  style objects, and multiline style declarations. Add snippets for components,
  static styles, state maps, and shared configuration.

  Fix highlighting inside unrelated strings and regular expressions, escaped
  quotes, template expressions, hex colors, single-letter classes, and nested
  advanced queries. Correct the TypeScript autocomplete setup example.

## 4.0.0

### Major Changes

- [#8](https://github.com/tenphi/tasty-vscode-extension/pull/8) [`145cabe`](https://github.com/tenphi/tasty-vscode-extension/commit/145cabe2dfee41a0a6c4a322a7b6c328cbae345e) Thanks [@tenphi](https://github.com/tenphi)! - Highlight the `@tenphi/tasty` v3 style DSL.

  At-rule keys use the CSS at-rule spelling v3 emits, and `@function` is recognized:
  `@keyframes`, `@property`, `@font-face`, `@counter-style`, `@function`, `@starting`.
  The v2 camelCase spellings (`@properties`, `@fontFace`, `@counterStyle`) no longer
  highlight as at-rule keys — that is the breaking part of this release. For tasty v2,
  pin `cube-dev.tasty-syntax-highlighting@^3`.

  `$$name(...)` and `##name(...)` CSS `@function` calls now highlight as calls
  (`support.function.custom-function.tasty`) instead of a custom-property reference
  followed by a stray group. The `'$$name'` definition key gets the same scope, so a
  definition looks like its call sites — which is what the `$$` convention is for. The
  bare `$$name` / `##name` forms that `transition` uses are unchanged.

  Fixed alongside, all found while verifying the above against a tokenizer:
  - The at-rule and color-token key patterns were unreachable. A catch-all quoted-key
    pattern sat above them, so `'@keyframes'` was highlighted as a state alias and a
    `'#primary':` token key came out as a bare `#` plus a state identifier. Both
    patterns now precede the catch-all.
  - Function calls in values lost to the bare-identifier state fallback, so `url()`,
    `calc()`, `min()`, `var()`, `repeat()`, `minmax()`, `translate()` and `okhsl()`
    were scoped as state constants with their arguments parsed as a logic group —
    `url("/f.woff2")` highlighted `.woff2` as a CSS class. Calls are now matched first.
  - Compound values kept being split at their first keyword: `auto-fill`, `flex-start`,
    `flex-end`, `revert-layer`, `row-reverse`, `column-reverse` and `wrap-reverse` all
    came out as three tokens. Same class of bug as the `inline-grid` fix in 3.0.4; the
    keyword alternations now try compounds before their prefixes.
  - `@parent(...)` now routes through the advanced-state patterns like its `@root` /
    `@own` / `@supports` siblings, so its contents and the `>` direct-parent marker are
    highlighted.

  New keywords: single-corner radius modifiers (`top-left`, `top-right`,
  `bottom-right`, `bottom-left` — previously split into three tokens), the `dock` and
  `longhand` output modifiers, and the preset modifiers `strong`, `bold`, `italic`,
  `icon`, `tight`.

  The README's "supported contexts" list claimed JSX inline styles, JSX style props and
  `variants: { ... }`. Those patterns were removed in 3.0.3 to stop highlight leakage
  and the list was never updated; it now describes what the grammar actually matches.

## 3.0.5

### Patch Changes

- [`6e89d8a`](https://github.com/tenphi/tasty-vscode-extension/commit/6e89d8af0068cd5740044cb5aeb07ee1ae3ad154) Thanks [@tenphi](https://github.com/tenphi)! - Add missing CSS value keyword highlighting for alignment (`flex-start`, `flex-end`, `space-between`, `space-around`, `space-evenly`, `baseline`, `start`, `end`), flex-flow (`row`, `column`, `row-reverse`, `column-reverse`, `wrap`, `nowrap`, `wrap-reverse`), position (`absolute`, `relative`, `fixed`, `sticky`, `static`), overflow (`visible`, `hidden`, `scroll`, `clip`, `ellipsis`), and CSS-wide keywords (`inherit`, `initial`, `unset`, `revert`, `revert-layer`). Also added `normal` to the general keywords.

## 3.0.4

### Patch Changes

- [`d339bd5`](https://github.com/tenphi/tasty-vscode-extension/commit/d339bd51a4734b9247cb478f43641b7fe54362ce) Thanks [@tenphi](https://github.com/tenphi)! - Fix compound CSS values like `inline-grid` being split into three tokens instead of one. Improve color token highlighting (`#primary`, `#surface`, etc.) to use a distinct scope from simple values.

## 3.0.3

### Patch Changes

- [`fc70825`](https://github.com/tenphi/tasty-vscode-extension/commit/fc70825d748746cc34b55fa5d24c2d15e801b9e3) Thanks [@tenphi](https://github.com/tenphi)! - Clean global patterns to avoid style leakage.

## 3.0.2

### Patch Changes

- [`1b82c10`](https://github.com/tenphi/tasty-vscode-extension/commit/1b82c10d402ae896413b824f3c5dd8c8cbedf192) Thanks [@tenphi](https://github.com/tenphi)! - Fix release workflow to create GitHub Release with .vsix

## 3.0.1

### Patch Changes

- [`e17947c`](https://github.com/tenphi/tasty-vscode-extension/commit/e17947cb9f97a79efa3656392dbd1c2fecc8c29c) Thanks [@tenphi](https://github.com/tenphi)! - Add CI/CD with changesets, ESLint, and Prettier
