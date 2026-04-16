# tasty-syntax-highlighting

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
