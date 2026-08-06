---
'tasty-syntax-highlighting': major
---

Highlight the `@tenphi/tasty` v3 style DSL.

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
