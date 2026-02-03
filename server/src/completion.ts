/**
 * Completion Provider
 *
 * Provides autocomplete suggestions for tasty styles.
 */

import {
  CompletionItem,
  CompletionItemKind,
  InsertTextFormat,
  MarkupKind,
  TextEdit,
  Range,
  Position,
} from 'vscode-languageserver/node';
import { MergedConfig } from '../../shared/src/configTypes';
import {
  ALL_STYLE_PROPERTIES,
  STYLE_PROPERTIES,
  BUILT_IN_UNITS,
  PRESET_MODIFIERS,
  DIRECTION_MODIFIERS,
  PSEUDO_CLASSES,
  getUnitDescription,
} from './builtins';
import { LocalDefinitions, createEmptyLocalDefinitions } from './localDefinitions';

/**
 * Context for completion.
 */
export interface CompletionContext {
  /** Are we completing a property name? */
  isPropertyName: boolean;
  /** Are we completing a property value? */
  isPropertyValue: boolean;
  /** The property name if we're completing a value */
  propertyName?: string;
  /** Text before the cursor in the current value */
  textBefore: string;
  /** Are we inside a state key (object key in style mapping)? */
  isStateKey: boolean;
  /** The current token being typed (for # and $ tokens) */
  currentToken?: string;
  /** Start offset of the current token within textBefore */
  tokenStartOffset?: number;
  /** End offset of the current token within textBefore */
  tokenEndOffset?: number;
  /** The cursor position in the document */
  position?: Position;
}

/**
 * Get completion items based on context.
 */
export function getCompletions(
  context: CompletionContext,
  config: MergedConfig,
  localDefs: LocalDefinitions = createEmptyLocalDefinitions(),
): CompletionItem[] {
  if (context.isPropertyName) {
    return getPropertyNameCompletions(config);
  }

  if (context.isStateKey) {
    return getStateKeyCompletions(context, config, localDefs);
  }

  if (context.isPropertyValue) {
    return getPropertyValueCompletions(context, config, localDefs);
  }

  return [];
}

/**
 * Get completions for property names.
 */
function getPropertyNameCompletions(config: MergedConfig): CompletionItem[] {
  const items: CompletionItem[] = [];

  // Built-in properties by category
  for (const [category, props] of Object.entries(STYLE_PROPERTIES)) {
    for (const prop of props) {
      items.push({
        label: prop,
        kind: CompletionItemKind.Property,
        detail: `(${category})`,
        sortText: `0-${category}-${prop}`,
      });
    }
  }

  return items;
}

/**
 * Create a TextEdit to replace the current token with a new value.
 */
function createTokenTextEdit(
  context: CompletionContext,
  newText: string,
): TextEdit | undefined {
  if (
    context.position === undefined ||
    context.tokenStartOffset === undefined ||
    context.tokenEndOffset === undefined
  ) {
    return undefined;
  }

  // Calculate the range to replace
  // The token starts at position.character - (tokenEndOffset - tokenStartOffset)
  const tokenLength = context.tokenEndOffset - context.tokenStartOffset;
  const startChar = context.position.character - tokenLength;

  return TextEdit.replace(
    Range.create(
      Position.create(context.position.line, startChar),
      context.position, // End at cursor position
    ),
    newText,
  );
}

/**
 * Get completions for property values.
 */
function getPropertyValueCompletions(
  context: CompletionContext,
  config: MergedConfig,
  localDefs: LocalDefinitions,
): CompletionItem[] {
  const items: CompletionItem[] = [];
  const { propertyName, textBefore, currentToken } = context;

  // Collect all tokens (config + local)
  const configTokens = Array.isArray(config.tokens) ? config.tokens : [];
  const allTokens = new Set([...configTokens, ...localDefs.tokens]);

  // Color tokens (when typing # or continuing a color token)
  if (textBefore === '' || textBefore.includes('#')) {
    for (const token of allTokens) {
      if (token.startsWith('#')) {
        // If we have a current token, do server-side prefix filtering
        if (currentToken && !token.toLowerCase().startsWith(currentToken.toLowerCase())) {
          continue;
        }

        const isLocal = localDefs.tokens.has(token);
        const textEdit = createTokenTextEdit(context, token);
        // Create alternative filter text by removing hyphens (helps with word boundary issues)
        const filterTextNoHyphens = token.replace(/-/g, '');
        
        items.push({
          label: token,
          kind: CompletionItemKind.Color,
          detail: isLocal ? 'color token (local)' : 'color token',
          sortText: isLocal ? `00-local-${token}` : `01-${token}`,
          // Use textEdit to replace the entire token, bypassing VSCode's word filtering
          textEdit,
          // insertText as fallback when textEdit is not available
          insertText: token,
          // filterText: use the token itself, or a version without hyphens to help matching
          filterText: currentToken || filterTextNoHyphens,
          // Commit characters help trigger completion on space or comma
          commitCharacters: [' ', ',', ')'],
        });
      }
    }
  }

  // Custom properties (when typing $ or continuing a custom property)
  if (textBefore === '' || textBefore.includes('$')) {
    for (const token of allTokens) {
      if (token.startsWith('$')) {
        // If we have a current token, do server-side prefix filtering
        if (currentToken && !token.toLowerCase().startsWith(currentToken.toLowerCase())) {
          continue;
        }

        const isLocal = localDefs.tokens.has(token);
        const textEdit = createTokenTextEdit(context, token);
        // Create alternative filter text by removing hyphens and $ prefix
        const filterTextNoHyphens = token.replace(/-/g, '').replace(/^\$/, '');
        
        items.push({
          label: token,
          kind: CompletionItemKind.Variable,
          detail: isLocal ? 'custom property (local)' : 'custom property',
          sortText: isLocal ? `00-local-${token}` : `01-${token}`,
          // Use textEdit to replace the entire token, bypassing VSCode's word filtering
          textEdit,
          // insertText as fallback
          insertText: token,
          // filterText: multiple options to help matching
          filterText: currentToken || filterTextNoHyphens,
          // Commit characters
          commitCharacters: [' ', ',', ')'],
        });
      }
    }
  }

  // Presets (for preset property)
  if (propertyName === 'preset') {
    for (const preset of config.presets) {
      items.push({
        label: preset,
        kind: CompletionItemKind.EnumMember,
        detail: 'typography preset',
        sortText: `0-${preset}`,
      });

      // Also suggest preset with modifiers
      for (const mod of PRESET_MODIFIERS) {
        items.push({
          label: `${preset} ${mod}`,
          kind: CompletionItemKind.EnumMember,
          detail: 'typography preset with modifier',
          sortText: `1-${preset}-${mod}`,
        });
      }
    }

    // Add preset modifiers on their own
    for (const mod of PRESET_MODIFIERS) {
      items.push({
        label: mod,
        kind: CompletionItemKind.Keyword,
        detail: 'preset modifier',
        sortText: `2-${mod}`,
      });
    }
  }

  // Units (when typing a number)
  if (/[0-9]$/.test(textBefore)) {
    const units = Array.isArray(config.units) ? config.units : BUILT_IN_UNITS;
    for (const unit of units) {
      items.push({
        label: unit,
        kind: CompletionItemKind.Unit,
        detail: getUnitDescription(unit),
        sortText: `0-${unit}`,
      });
    }
  }

  // Direction modifiers (for padding, margin, border, radius)
  if (['padding', 'margin', 'border', 'radius', 'outline', 'inset', 'fade'].includes(propertyName ?? '')) {
    for (const dir of DIRECTION_MODIFIERS) {
      items.push({
        label: dir,
        kind: CompletionItemKind.Keyword,
        detail: 'direction modifier',
        sortText: `0-${dir}`,
      });
    }
  }

  // Shape keywords (for radius)
  if (propertyName === 'radius') {
    const shapes = ['round', 'ellipse', 'leaf', 'backleaf'];
    for (const shape of shapes) {
      items.push({
        label: shape,
        kind: CompletionItemKind.Keyword,
        detail: 'radius shape',
        sortText: `0-${shape}`,
      });
    }
  }

  // Semantic transition names (for transition property)
  if (propertyName === 'transition') {
    const transitions = [
      'theme', 'fill', 'fade', 'background', 'border', 'radius',
      'shadow', 'outline', 'preset', 'text', 'width', 'height',
      'gap', 'zIndex', 'filter', 'translate', 'rotate', 'scale',
      'placeSelf', 'mark', 'image',
    ];
    for (const t of transitions) {
      items.push({
        label: t,
        kind: CompletionItemKind.Keyword,
        detail: 'semantic transition',
        sortText: `0-${t}`,
      });
    }
  }

  // Scrollbar modifiers
  if (propertyName === 'scrollbar') {
    const modifiers = ['thin', 'auto', 'none', 'styled', 'stable', 'both-edges', 'always'];
    for (const mod of modifiers) {
      items.push({
        label: mod,
        kind: CompletionItemKind.Keyword,
        detail: 'scrollbar modifier',
        sortText: `0-${mod}`,
      });
    }
  }

  // Width/height modifiers
  if (['width', 'height'].includes(propertyName ?? '')) {
    const modifiers = ['min', 'max', 'fixed', 'stretch'];
    for (const mod of modifiers) {
      items.push({
        label: mod,
        kind: CompletionItemKind.Keyword,
        detail: 'dimension modifier',
        sortText: `0-${mod}`,
      });
    }
  }

  // textOverflow patterns
  if (propertyName === 'textOverflow') {
    items.push({
      label: 'ellipsis',
      kind: CompletionItemKind.Keyword,
      detail: 'single-line truncation',
      sortText: '0-ellipsis',
    });
    items.push({
      label: 'clip',
      kind: CompletionItemKind.Keyword,
      detail: 'single-line clip',
      sortText: '0-clip',
    });
    items.push({
      label: 'ellipsis / 3',
      kind: CompletionItemKind.Snippet,
      detail: 'multi-line truncation (3 lines)',
      insertText: 'ellipsis / ${1:3}',
      insertTextFormat: InsertTextFormat.Snippet,
      sortText: '1-ellipsis-lines',
    });
  }

  // Boolean values (for hide, reset, border)
  if (['hide', 'reset', 'border', 'outline'].includes(propertyName ?? '')) {
    items.push({
      label: 'true',
      kind: CompletionItemKind.Keyword,
      sortText: '0-true',
    });
    items.push({
      label: 'false',
      kind: CompletionItemKind.Keyword,
      sortText: '0-false',
    });
  }

  // Border style values
  if (['border', 'outline'].includes(propertyName ?? '')) {
    const borderStyles = ['solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset', 'none', 'hidden'];
    for (const style of borderStyles) {
      items.push({
        label: style,
        kind: CompletionItemKind.Keyword,
        detail: 'border style',
        sortText: `1-${style}`,
      });
    }
  }

  // Flow property values (flex/grid direction)
  if (propertyName === 'flow') {
    const flowValues = [
      { value: 'row', detail: 'flex-flow: row' },
      { value: 'column', detail: 'flex-flow: column' },
      { value: 'row wrap', detail: 'flex-flow: row wrap' },
      { value: 'column wrap', detail: 'flex-flow: column wrap' },
      { value: 'row nowrap', detail: 'flex-flow: row nowrap' },
      { value: 'column nowrap', detail: 'flex-flow: column nowrap' },
      { value: 'row dense', detail: 'grid-auto-flow: row dense' },
      { value: 'column dense', detail: 'grid-auto-flow: column dense' },
    ];
    for (const { value, detail } of flowValues) {
      items.push({
        label: value,
        kind: CompletionItemKind.EnumMember,
        detail,
        sortText: `0-${value}`,
      });
    }
  }

  // Display property values
  if (propertyName === 'display') {
    const displayValues = ['flex', 'grid', 'block', 'inline', 'inline-flex', 'inline-grid', 'none', 'contents'];
    for (const value of displayValues) {
      items.push({
        label: value,
        kind: CompletionItemKind.EnumMember,
        detail: `display: ${value}`,
        sortText: `0-${value}`,
      });
    }
  }

  return items;
}

/**
 * Get completions for state keys.
 */
function getStateKeyCompletions(
  context: CompletionContext,
  config: MergedConfig,
  localDefs: LocalDefinitions,
): CompletionItem[] {
  const items: CompletionItem[] = [];
  const { textBefore } = context;

  // Default state
  items.push({
    label: "''",
    kind: CompletionItemKind.Keyword,
    detail: 'default state',
    insertText: "''",
    sortText: '0-default',
  });

  // Local states from this file (higher priority)
  for (const state of localDefs.states) {
    // Skip if it's a pseudo-class, advanced state, or common modifier (will be added below)
    if (state.startsWith(':') || state.startsWith('@') || state.startsWith('.')) {
      continue;
    }
    items.push({
      label: state,
      kind: CompletionItemKind.Keyword,
      detail: 'state (local)',
      sortText: `1-local-${state}`,
    });
  }

  // State aliases from config
  for (const state of config.states) {
    items.push({
      label: state,
      kind: CompletionItemKind.Keyword,
      detail: 'state alias',
      sortText: `2-${state}`,
    });
  }

  // Common boolean modifiers
  const commonMods = [
    'hovered',
    'pressed',
    'focused',
    'disabled',
    'checked',
    'selected',
    'active',
    'loading',
    'open',
    'expanded',
  ];
  for (const mod of commonMods) {
    // Skip if already added from local states
    if (localDefs.states.has(mod)) {
      continue;
    }
    items.push({
      label: mod,
      kind: CompletionItemKind.Keyword,
      detail: 'boolean modifier',
      sortText: `3-${mod}`,
    });
  }

  // Pseudo-classes (when typing :)
  if (textBefore.endsWith(':') || textBefore === '') {
    for (const pseudo of PSEUDO_CLASSES) {
      items.push({
        label: `:${pseudo}`,
        kind: CompletionItemKind.Keyword,
        detail: 'pseudo-class',
        insertText: textBefore.endsWith(':') ? pseudo : `:${pseudo}`,
        sortText: `3-${pseudo}`,
      });
    }
  }

  // Advanced states (when typing @)
  if (textBefore.endsWith('@') || textBefore === '') {
    items.push({
      label: '@media',
      kind: CompletionItemKind.Keyword,
      detail: 'media query state',
      insertText: textBefore.endsWith('@') ? 'media($1)' : '@media($1)',
      insertTextFormat: InsertTextFormat.Snippet,
      sortText: '4-media',
      documentation: {
        kind: MarkupKind.Markdown,
        value: 'Media query state. Example: `@media(w < 768px)`',
      },
    });
    items.push({
      label: '@(...)',
      kind: CompletionItemKind.Keyword,
      detail: 'container query shorthand',
      insertText: textBefore.endsWith('@') ? '($1)' : '@($1)',
      insertTextFormat: InsertTextFormat.Snippet,
      sortText: '4-container',
      documentation: {
        kind: MarkupKind.Markdown,
        value: 'Container query shorthand. Examples:\n- `@(w >= 400px)` - unnamed container\n- `@(panel, w >= 300px)` - named container\n- `@(card, $variant=danger)` - style query',
      },
    });
    items.push({
      label: '@root',
      kind: CompletionItemKind.Keyword,
      detail: 'root state',
      insertText: textBefore.endsWith('@') ? 'root($1)' : '@root($1)',
      insertTextFormat: InsertTextFormat.Snippet,
      sortText: '4-root',
      documentation: {
        kind: MarkupKind.Markdown,
        value: 'Root state for styling based on document root attributes. Example: `@root(theme=dark)`',
      },
    });
    items.push({
      label: '@own',
      kind: CompletionItemKind.Keyword,
      detail: 'own state (for sub-elements)',
      insertText: textBefore.endsWith('@') ? 'own($1)' : '@own($1)',
      insertTextFormat: InsertTextFormat.Snippet,
      sortText: '4-own',
      documentation: {
        kind: MarkupKind.Markdown,
        value: "Sub-element's own state. Use inside sub-element style blocks. Example: `@own(hovered)`",
      },
    });
    items.push({
      label: '@supports',
      kind: CompletionItemKind.Keyword,
      detail: 'supports query',
      insertText: textBefore.endsWith('@') ? 'supports($1)' : '@supports($1)',
      insertTextFormat: InsertTextFormat.Snippet,
      sortText: '4-supports',
      documentation: {
        kind: MarkupKind.Markdown,
        value: 'Feature/selector support query. Examples:\n- `@supports(display: grid-lanes)`\n- `@supports($, :has(*))` - selector support',
      },
    });
    items.push({
      label: '@starting',
      kind: CompletionItemKind.Keyword,
      detail: 'entry animation state',
      insertText: textBefore.endsWith('@') ? 'starting' : '@starting',
      sortText: '4-starting',
      documentation: {
        kind: MarkupKind.Markdown,
        value: 'Entry animation state using `@starting-style`. Use with `transition` for entry animations.',
      },
    });
  }

  // Logical operators
  items.push({
    label: '&',
    kind: CompletionItemKind.Operator,
    detail: 'AND operator',
    sortText: '9-and',
  });
  items.push({
    label: '|',
    kind: CompletionItemKind.Operator,
    detail: 'OR operator',
    sortText: '9-or',
  });
  items.push({
    label: '!',
    kind: CompletionItemKind.Operator,
    detail: 'NOT operator',
    sortText: '9-not',
  });
  items.push({
    label: '^',
    kind: CompletionItemKind.Operator,
    detail: 'XOR operator',
    sortText: '9-xor',
  });

  return items;
}

