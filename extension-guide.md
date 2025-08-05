# Tasty Syntax Highlighting Extension

A VS Code extension that provides syntax highlighting for Tasty CSS-in-JS styles in TSX files.

## Features

This extension automatically detects and highlights Tasty style syntax in:
- `styles` properties of React components and objects
- Properties ending with `Styles` (e.g., `inputStyles`, `buttonStyles`)

### Supported Syntax Highlighting

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
- **Dynamic state logic**: Any identifier as state + logical operators `&` (AND), `|` (OR), `^` (XOR), `!` (NOT)
- **CSS selectors**: `:hover`, `.class`, `[data-attr="value"]`, `:nth-child(2n+1)`
- **Complex expressions**: `'!disabled & custom-state'`, `'(loading | processing) & !readonly'`
- **Comments**: CSS-style comments `/* ... */`

## Development Setup

### Prerequisites

- Node.js 16 or higher
- VS Code

### Local Development

1. Clone the repository and navigate to the extension directory:
   ```bash
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

### Testing the Extension

Create a test TSX file with Tasty styles:

```tsx
import { tasty } from '@cube-dev/ui-kit';

const Button = tasty({
  as: 'button',
  styles: {
    padding: '2x 4x',
    fill: {
      '': '#primary',
      'hovered': '#primary.8',
      'pressed': '#primary.6',
      '[disabled]': '#gray'
    },
    color: '#white',
    radius: '1r',
    border: 'none',
    preset: 't3',
    transition: 'fill 0.2s'
  },
  variants: {
    small: { padding: '1x 2x', preset: 't4' },
    large: { padding: '3x 6x', preset: 't2' }
  }
});

const Component = () => (
  <div
    inputStyles="border: 1bw solid #border; radius: 1r; padding: 2x; fill: #white"
    buttonStyles="fill: #primary; color: #white; radius: 1r; preset: t3"
  >
    Content
  </div>
);
```

The strings inside `styles`, `inputStyles`, and `buttonStyles` properties should have syntax highlighting applied.

## Building

### Compile TypeScript

```bash
npm run compile
```

### Watch mode for development

```bash
npm run watch
```

### Build for production

```bash
npm run package
```

### Create VSIX package

```bash
npm run build:vsix
```

This will create a `.vsix` file that can be installed in VS Code.

## Installation

### From VSIX file

1. Build the VSIX package:
   ```bash
   npm run build:vsix
   ```

2. Install in VS Code:
   ```bash
   code --install-extension tasty-syntax-highlighting-1.0.0.vsix
   ```

   Or through VS Code UI:
   - Open VS Code
   - Go to Extensions view (`Ctrl+Shift+X`)
   - Click on "..." menu
   - Select "Install from VSIX..."
   - Choose the generated `.vsix` file

### Development Installation

1. Copy the extension to VS Code extensions folder:
   ```bash
   # On macOS/Linux
   cp -r . ~/.vscode/extensions/tasty-syntax-highlighting
   
   # On Windows
   xcopy /E /I . "%USERPROFILE%\.vscode\extensions\tasty-syntax-highlighting"
   ```

2. Restart VS Code

## Usage

The extension automatically activates when you open TSX or TS files. No additional configuration is required.

### Supported Patterns

The extension recognizes Tasty styles in these contexts:

1. **Tasty component styles**:
   ```tsx
   const Card = tasty({
     styles: {
       padding: '4x',
       fill: '#surface',
       border: '1bw solid #border',
       radius: '2r'
     }
   });
   ```

2. **Properties ending with 'Styles'**:
   ```tsx
   <Component
     inputStyles="border: 1bw solid #border; radius: 1r; fill: #white"
     buttonStyles="fill: #primary; color: #white; preset: t3"
   />
   ```

3. **Dynamic state logic with any identifiers**:
   ```tsx
   const Button = tasty({
     styles: {
       fill: {
         '': '#primary',
         '!disabled & any-custom-state': '#primary.8',   // Any custom state name
         'loading | processing': '#gray',                // Custom states OR logic
         '(user-active & !readonly) | forced': '#blue',  // Grouped custom logic
         '[data-size="large"]': '#large-primary',        // Data attributes
         ':focus-visible': '#purple',                    // CSS pseudo-classes
         '.interactive.primary': '#special'             // CSS class selectors
       }
     }
   });
   ```

## Troubleshooting

### Extension not working

1. Ensure you're working with `.tsx` or `.ts` files
2. Check that the styles are in the correct property names (`styles` or ending with `Styles`)
3. Reload VS Code window (`Ctrl+Shift+P` → "Developer: Reload Window")

### Syntax highlighting not appearing

1. Verify the file language mode is set to "TypeScript React" or "TypeScript"
2. Check VS Code settings for syntax highlighting
3. Try disabling and re-enabling the extension

## Contributing

1. Make changes to the grammar in `syntaxes/tasty.tmLanguage.json`
2. Test changes by pressing `F5` in VS Code
3. Update documentation as needed
4. Build and test the VSIX package

## License

MIT
