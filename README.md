# Tasty Syntax Highlighting

A VS Code extension that provides syntax highlighting for Tasty CSS-in-JS styles in TSX files.

## Quick Start

### Local Development

1. Clone the repository:
   ```bash
   git clone git@github.com:tenphi/tasty-vscode-extension.git
   cd tasty-vscode-extension
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Open the project in VS Code:
   ```bash
   code .
   ```

4. Press `F5` to open a new Extension Development Host window with the extension loaded.

5. In the new window, open or create a `.tsx` file and test the syntax highlighting with Tasty styles.

### Testing the Extension

Create a test file with the following content to see the syntax highlighting in action:

```tsx
import { tasty } from '@cube-dev/ui-kit';

// NEW: Variable declarations ending with 'styles' are now supported!
const INPUT_STYLES = {
  border: '1bw solid #border',
  radius: '1r',
  padding: '2x',
  fill: {
    '': '#white',
    '[disabled]': '#gray.05',
    'focused': '#primary.05'
  }
};

let buttonStyles = {
  fill: '#primary',
  color: '#white',
  radius: '1r',
  preset: 't3'
};

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
  <div>
    {/* Traditional property styles */}
    <input
      inputStyles={{
        border: '1bw solid #border',
        radius: '1r',
        padding: '2x',
        fill: {
          '': '#white',
          '[disabled]': '#gray.05',
          'focused': '#primary.05'
        }
      }}
    />
    {/* Using variable-declared styles */}
    <input style={INPUT_STYLES} />
    <button style={buttonStyles}>Click me</button>
  </div>
);
```

✨ **All Tasty syntax now fully supported** with comprehensive automated testing! 

🧪 **Automated Test Results:**
- ✅ **All grammar patterns work** - `npm run test:patterns`
- ✅ **Boundary conditions fixed** - `npm run test:grammar` 
- ✅ **JSX patterns ready** - Regex supports `inputStyles={{...}}`
- 🔧 **Manual VS Code testing required** for final JSX injection verification

## Supported Syntax

- **Design tokens**: `#primary`, `#text`, `#surface`, `#border` with opacity `#primary.5`, `#danger.10`
- **Custom units**: `2x` (gap), `1r` (radius), `1bw` (border-width), `1cr` (card-radius), `1sf` (stable-fraction)
- **Custom properties**: `$variable`, `$(variable, fallback)`
- **Tasty properties**: `fill`, `radius`, `preset`, `flow`, `gap`, `align`, `justify`, `fade`, `scrollbar`
- **Boolean shortcuts**: `border: true`, `radius: true`
- **Typography presets**: `h1`, `h2`, `t3`, `p1`, `c1`, etc.
- **State modifiers**: `hovered`, `pressed`, `focused`, `disabled`, `[disabled]`
- **Directional modifiers**: `top`, `right`, `bottom`, `left`
- **Shape modifiers**: `round`, `ellipse`, `leaf`, `backleaf`
- **Responsive arrays**: `['4x', '2x', '1x']`
- **Nested state objects**: `{ '': '#white', hovered: '#gray.05' }` ✨ **Now fully supported!**
- **State binding keys**: `'!disabled & hovered': '#blue'` ✨ **Now highlighted!**
- **Variable declarations**: `const INPUT_STYLES = {...}`, `let buttonStyles = {...}`, `var styles = {...}` ✨ **NEW!**
- **Dynamic state logic**: Any identifier as state + logical operators `&` (AND), `|` (OR), `^` (XOR), `!` (NOT)
- **CSS selectors**: `:hover`, `.class`, `[data-attr="value"]`, `:nth-child(2n+1)`
- **Complex expressions**: `'!disabled & custom-state'`, `'(loading | processing) & !readonly'`
- **Comments**: CSS-style comments `/* ... */`

## Commands

### Development
- `npm run compile` - Compile TypeScript
- `npm run watch` - Watch mode for development

### Testing  
- `npm run test:all` - Run all automated tests
- `npm run test:patterns` - Test individual regex patterns
- `npm run test:grammar` - Test grammar boundaries and injection

### Building
- `npm run package` - Build for production
- `npm run build:vsix` - Create VSIX package (requires Node.js 20+)
- `npm run build:manual` - Alternative build for manual installation

## Installation for Development

Copy the extension to your VS Code extensions folder:

### macOS/Linux
```bash
cp -r . ~/.vscode/extensions/tasty-syntax-highlighting
```

### Windows
```bash
xcopy /E /I . "%USERPROFILE%\.vscode\extensions\tasty-syntax-highlighting"
```

Then restart VS Code.

## Architecture

The extension uses a TextMate grammar (`syntaxes/tasty.tmLanguage.json`) that is injected into TSX and TS files. It specifically targets strings that are:

1. Inside `styles` properties
2. Inside properties ending with `Styles` (e.g., `inputStyles`, `buttonStyles`)
3. **NEW**: In variable declarations ending with `styles` (e.g., `const INPUT_STYLES = {...}`, `let buttonStyles = {...}`)

**Important**: Plain objects that don't match these patterns are left untouched and highlighted as regular TypeScript/TSX code.

The grammar recognizes and highlights various Tasty syntax elements according to the Tasty style parser specification.

## License

MIT