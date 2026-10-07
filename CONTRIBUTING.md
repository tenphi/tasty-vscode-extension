# Contributing

Repository tooling uses Node.js 22.13+ on the 22.x line (or Node.js 24+) and npm
10.9+. The extension remains grammar-only and supports VS Code 1.74+.

```sh
npm ci
npm run typecheck
npm run lint
npm run format
npm test
npm run package
```

The tests run the real TextMate/Oniguruma tokenizer with the built-in TS, TSX, JS,
and JSX grammars from VS Code 1.74. They check token scopes and highlighting
boundaries, including ordinary code after each style object. Add regression
fixtures when changing context detection or DSL patterns. Release tests verify
that interrupted uploads are recoverable and that builds exist before releases
are created.

Use Conventional Commits. Add a `.changeset/*.md` file for user-visible changes:

```md
---
'tasty-syntax-highlighting': patch
---

Describe the changed editor behavior.
```

Use `minor` for new features. Before pushing a feature branch, run typecheck,
lint, formatting, tests, and packaging in that order.

## Dependencies

Choose compatible, stable, non-deprecated versions published at least 14 full
days ago. Verify npm publication timestamps and GitHub Actions release dates;
record the UTC cutoff and selected versions in the PR. Resolve transitive npm
dependencies with `npm install --before=<UTC-cutoff>`. Do not raise the VS Code
minimum to accommodate build tooling. Review major migrations and keep coupled
packages in sync.

Two targeted transitive overrides are currently required: `typed-rest-client`
pins an affected `qs`, so use the mature `qs@6.16.0` fix. `launch-editor` uses
`shell-quote.parse()`; pin `shell-quote@1.11.0`, the first fix for the critical
GHSA-pqg4-j6r4-53mv. All mature versions have security advisories, so this is a
version-specific exception to the 14-day policy (published 29 September 2026).
The command-parsing compatibility test covers this override. Version 1.12.0 is
held until it matures. Reconsider both overrides during future dependency work.

## GitHub releases

The release workflow opens a Changesets version PR after feature changes merge.
Its version command synchronizes the lockfile offline without resolving new
dependency versions.
Merge that PR to build a VSIX and publish it as a downloadable GitHub release
asset. PR CI also provides a VSIX artifact for review.

The upload happens while a new release is a draft. A failed upload can be retried
by rerunning its original workflow; drafts are pinned to that tested commit.
Manual dispatch on `main` can repair missing assets on published releases.
No npm or Marketplace publishing is configured.
