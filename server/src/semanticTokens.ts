/**
 * Semantic Token Provider
 *
 * Provides semantic tokens for tasty syntax highlighting.
 */

import * as ts from 'typescript';
import {
  SemanticTokensBuilder,
  SemanticTokensLegend,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { TastyToken, TastyTokenType } from '../../shared/src/types';
import { MergedConfig } from '../../shared/src/configTypes';
import { DetectedStyleObject, getStyleProperties } from './contextDetector';
import { parseValue } from './tastyParser';
import { parseStateKey } from './stateParser';
import { ALL_STYLE_PROPERTIES } from './builtins';

/**
 * Semantic token types for the legend.
 */
export const TOKEN_TYPES = [
  'property',
  'variable',
  'type',
  'number',
  'keyword',
  'operator',
  'namespace',
  'function',
  'string',
  'enumMember',
  'macro',
  'regexp',
  'parameter',
  'comment',
] as const;

/**
 * Semantic token modifiers for the legend.
 */
export const TOKEN_MODIFIERS = [
  'definition',
  'declaration',
  'readonly',
  'defaultLibrary',
  'deprecated',
] as const;

/**
 * The semantic tokens legend.
 */
export const SEMANTIC_TOKENS_LEGEND: SemanticTokensLegend = {
  tokenTypes: [...TOKEN_TYPES],
  tokenModifiers: [...TOKEN_MODIFIERS],
};

/**
 * Helper to get token type index by name.
 */
function tokenIndex(name: typeof TOKEN_TYPES[number]): number {
  return TOKEN_TYPES.indexOf(name);
}

/**
 * Map from TastyTokenType to semantic token type index.
 * Uses tokenIndex() to derive indices from TOKEN_TYPES array.
 */
const TOKEN_TYPE_MAP: Record<TastyTokenType, number> = {
  [TastyTokenType.ColorToken]: tokenIndex('type'),
  [TastyTokenType.HexColor]: tokenIndex('type'),
  [TastyTokenType.CustomProperty]: tokenIndex('variable'),
  [TastyTokenType.CustomPropertyName]: tokenIndex('variable'),
  [TastyTokenType.ColorTokenName]: tokenIndex('type'),
  [TastyTokenType.CustomUnit]: tokenIndex('number'),
  [TastyTokenType.CssUnit]: tokenIndex('number'),
  [TastyTokenType.Number]: tokenIndex('number'),
  [TastyTokenType.Boolean]: tokenIndex('keyword'),
  [TastyTokenType.Preset]: tokenIndex('enumMember'),
  [TastyTokenType.PresetModifier]: tokenIndex('enumMember'),
  [TastyTokenType.Direction]: tokenIndex('parameter'),
  [TastyTokenType.Function]: tokenIndex('function'),
  [TastyTokenType.String]: tokenIndex('string'),
  [TastyTokenType.Identifier]: tokenIndex('string'),
  [TastyTokenType.Operator]: tokenIndex('operator'),

  // State tokens
  [TastyTokenType.DefaultState]: tokenIndex('keyword'),
  [TastyTokenType.BooleanMod]: tokenIndex('keyword'),
  [TastyTokenType.ValueMod]: tokenIndex('keyword'),
  [TastyTokenType.PseudoClass]: tokenIndex('keyword'),
  [TastyTokenType.ClassSelector]: tokenIndex('regexp'),
  [TastyTokenType.AttrSelector]: tokenIndex('regexp'),
  [TastyTokenType.MediaState]: tokenIndex('macro'),
  [TastyTokenType.ContainerState]: tokenIndex('macro'),
  [TastyTokenType.SupportsState]: tokenIndex('macro'),
  [TastyTokenType.RootState]: tokenIndex('macro'),
  [TastyTokenType.OwnState]: tokenIndex('macro'),
  [TastyTokenType.StartingState]: tokenIndex('macro'),
  [TastyTokenType.StateOperator]: tokenIndex('operator'),
  [TastyTokenType.StateAlias]: tokenIndex('macro'),

  // Special
  [TastyTokenType.SubElement]: tokenIndex('namespace'),
  [TastyTokenType.SelectorAffix]: tokenIndex('property'),
  [TastyTokenType.AtRule]: tokenIndex('macro'),
  [TastyTokenType.Punctuation]: tokenIndex('operator'),
  [TastyTokenType.Whitespace]: tokenIndex('comment'),
  [TastyTokenType.Unknown]: tokenIndex('comment'),
};

/**
 * Provide semantic tokens for a document.
 * Uses pre-parsed source file and contexts from the cache.
 */
export function provideSemanticTokens(
  document: TextDocument,
  sourceFile: ts.SourceFile,
  contexts: DetectedStyleObject[],
  config: MergedConfig,
): SemanticTokensBuilder {
  const builder = new SemanticTokensBuilder();

  // Process each context
  for (const { context, node } of contexts) {
    processStyleObject(document, builder, node, sourceFile, config, 0);
  }

  return builder;
}

/**
 * Process a style object and emit semantic tokens.
 */
function processStyleObject(
  document: TextDocument,
  builder: SemanticTokensBuilder,
  node: ts.ObjectLiteralExpression,
  sourceFile: ts.SourceFile,
  config: MergedConfig,
  depth: number,
): void {
  const properties = getStyleProperties(node, sourceFile);

  for (const prop of properties) {
    // Emit token for property name
    const namePos = document.positionAt(prop.nameStart);

    if (prop.isSubElement) {
      // Sub-element (capitalized key like Title, Content)
      builder.push(
        namePos.line,
        namePos.character,
        prop.nameEnd - prop.nameStart,
        TOKEN_TYPE_MAP[TastyTokenType.SubElement],
        0,
      );

      // Process the sub-element's styles recursively
      if (ts.isObjectLiteralExpression(prop.value)) {
        processStyleObject(document, builder, prop.value, sourceFile, config, depth + 1);
      }
    } else if (prop.name.startsWith('#')) {
      // Local color token definition (#tabs-fade-left, ##token-reference)
      builder.push(
        namePos.line,
        namePos.character,
        prop.nameEnd - prop.nameStart,
        TOKEN_TYPE_MAP[TastyTokenType.ColorToken],
        0,
      );

      // Process the token's state mapping
      if (ts.isObjectLiteralExpression(prop.value)) {
        processStateMapping(document, builder, prop.value, sourceFile, config);
      }
    } else if (prop.name.startsWith('$') && prop.name !== '$') {
      // Local custom property definition ($my-var)
      builder.push(
        namePos.line,
        namePos.character,
        prop.nameEnd - prop.nameStart,
        TOKEN_TYPE_MAP[TastyTokenType.CustomProperty],
        0,
      );

      // Process the property's state mapping
      if (ts.isObjectLiteralExpression(prop.value)) {
        processStateMapping(document, builder, prop.value, sourceFile, config);
      }
    } else if (prop.name.startsWith('@')) {
      // At-rule (@keyframes, @properties)
      builder.push(
        namePos.line,
        namePos.character,
        prop.nameEnd - prop.nameStart,
        TOKEN_TYPE_MAP[TastyTokenType.AtRule],
        0,
      );
      
      // Process @keyframes content specially
      if (prop.name === '@keyframes' && ts.isObjectLiteralExpression(prop.value)) {
        processKeyframesObject(document, builder, prop.value, sourceFile, config);
      }
    } else if (prop.name === '$') {
      // Selector affix
      builder.push(
        namePos.line,
        namePos.character,
        prop.nameEnd - prop.nameStart,
        TOKEN_TYPE_MAP[TastyTokenType.SelectorAffix],
        0,
      );
    } else if (prop.isStateKey) {
      // State key (e.g., 'hovered', ':hover', '@media(...)')
      processStateKey(document, builder, prop.name, prop.nameStart, config);
    } else {
      // Regular style property
      const isBuiltIn = ALL_STYLE_PROPERTIES.includes(prop.name);

      if (isBuiltIn) {
        builder.push(
          namePos.line,
          namePos.character,
          prop.nameEnd - prop.nameStart,
          0, // property
          1 << 3, // defaultLibrary modifier
        );
      } else {
        // Unknown or custom property
        builder.push(
          namePos.line,
          namePos.character,
          prop.nameEnd - prop.nameStart,
          0, // property
          1 << 4, // deprecated modifier (to show warning styling)
        );
      }
    }

    // Process the value
    if (ts.isStringLiteral(prop.value) || ts.isNoSubstitutionTemplateLiteral(prop.value)) {
      // String value - tokenize it
      const valueText = prop.value.text;
      const valueStart = prop.valueStart + 1; // Skip opening quote

      processStyleValue(document, builder, valueText, valueStart, config);
    } else if (ts.isObjectLiteralExpression(prop.value)) {
      // Object value (state mapping or nested styles)
      if (prop.isSubElement || prop.name.startsWith('@')) {
        // Nested styles or at-rule content
        console.error('[DEBUG] Processing nested styles for:', prop.name);
        processStyleObject(document, builder, prop.value, sourceFile, config, depth + 1);
      } else {
        // State mapping
        console.error('[DEBUG] Processing state mapping for property:', prop.name);
        processStateMapping(document, builder, prop.value, sourceFile, config);
      }
    } else if (ts.isTemplateExpression(prop.value)) {
      // Template literal with expressions
      processTemplateLiteral(document, builder, prop.value, sourceFile, config);
    }
  }
}

/**
 * Process a state mapping object { '': value, 'hovered': value, ... }
 */
function processStateMapping(
  document: TextDocument,
  builder: SemanticTokensBuilder,
  node: ts.ObjectLiteralExpression,
  sourceFile: ts.SourceFile,
  config: MergedConfig,
): void {
  console.error('[DEBUG] processStateMapping called, properties:', node.properties.length);
  
  for (const prop of node.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;

    // Get the state key
    let keyText: string;
    let keyStart: number;
    let keyEnd: number;

    if (ts.isStringLiteral(prop.name)) {
      keyText = prop.name.text;
      keyStart = prop.name.getStart(sourceFile) + 1; // Skip opening quote
      keyEnd = prop.name.getEnd() - 1; // Skip closing quote
    } else if (ts.isIdentifier(prop.name)) {
      keyText = prop.name.text;
      keyStart = prop.name.getStart(sourceFile);
      keyEnd = prop.name.getEnd();
    } else {
      continue;
    }

    console.error('[DEBUG] State key:', keyText, 'at offset', keyStart);

    // Process the state key
    processStateKey(document, builder, keyText, keyStart, config);

    // Process the value
    if (ts.isStringLiteral(prop.initializer) || ts.isNoSubstitutionTemplateLiteral(prop.initializer)) {
      const valueText = prop.initializer.text;
      const valueStart = prop.initializer.getStart(sourceFile) + 1;

      processStyleValue(document, builder, valueText, valueStart, config);
    }
  }
}

/**
 * Process a state key and emit semantic tokens.
 */
function processStateKey(
  document: TextDocument,
  builder: SemanticTokensBuilder,
  key: string,
  offset: number,
  config: MergedConfig,
): void {
  const tokens = parseStateKey(key, config.states);
  console.error('[DEBUG] parseStateKey("' + key + '") returned', tokens.length, 'tokens:', JSON.stringify(tokens));

  for (const token of tokens) {
    if (token.type === TastyTokenType.Whitespace || token.type === TastyTokenType.DefaultState) {
      continue;
    }

    // For tokens with children (like @media with inner expressions),
    // emit the keyword part and then the children separately
    if (token.children && token.children.length > 0) {
      // Emit the keyword part (e.g., "@media")
      // Find where the opening paren is to get keyword length
      const parenIndex = token.value.indexOf('(');
      if (parenIndex > 0) {
        const keywordPos = document.positionAt(offset + token.start);
        builder.push(
          keywordPos.line,
          keywordPos.character,
          parenIndex,
          TOKEN_TYPE_MAP[token.type],
          0,
        );
      }

      // Emit children tokens
      emitStateTokenChildren(document, builder, token.children, offset);
    } else {
      const pos = document.positionAt(offset + token.start);
      const tokenTypeIndex = TOKEN_TYPE_MAP[token.type];
      console.error('[DEBUG] Pushing state token:', token.type, 'at line', pos.line, 'char', pos.character, 'length', token.end - token.start, 'tokenTypeIndex', tokenTypeIndex);
      builder.push(
        pos.line,
        pos.character,
        token.end - token.start,
        tokenTypeIndex,
        0,
      );
    }
  }
}

/**
 * Emit semantic tokens for state token children.
 */
function emitStateTokenChildren(
  document: TextDocument,
  builder: SemanticTokensBuilder,
  children: TastyToken[],
  offset: number,
): void {
  for (const child of children) {
    if (child.type === TastyTokenType.Whitespace) continue;

    const pos = document.positionAt(offset + child.start);
    builder.push(
      pos.line,
      pos.character,
      child.end - child.start,
      TOKEN_TYPE_MAP[child.type],
      0,
    );

    if (child.children) {
      emitStateTokenChildren(document, builder, child.children, offset);
    }
  }
}

/**
 * Process a style value and emit semantic tokens.
 */
function processStyleValue(
  document: TextDocument,
  builder: SemanticTokensBuilder,
  value: string,
  offset: number,
  config: MergedConfig,
): void {
  const tokens = parseValue(value, {
    tokens: config.tokens,
    units: Array.isArray(config.units) ? config.units : undefined,
    presets: config.presets,
  });

  emitTokens(document, builder, tokens, offset);
}

/**
 * Emit semantic tokens for parsed tokens.
 */
function emitTokens(
  document: TextDocument,
  builder: SemanticTokensBuilder,
  tokens: TastyToken[],
  offset: number,
): void {
  for (const token of tokens) {
    if (token.type === TastyTokenType.Whitespace) {
      continue;
    }

    const pos = document.positionAt(offset + token.start);
    builder.push(
      pos.line,
      pos.character,
      token.end - token.start,
      TOKEN_TYPE_MAP[token.type],
      0,
    );

    // Process children (for functions)
    if (token.children) {
      emitTokens(document, builder, token.children, offset);
    }
  }
}

/**
 * Process a @keyframes object and emit semantic tokens for percentage keys.
 */
function processKeyframesObject(
  document: TextDocument,
  builder: SemanticTokensBuilder,
  node: ts.ObjectLiteralExpression,
  sourceFile: ts.SourceFile,
  config: MergedConfig,
): void {
  for (const prop of node.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;

    // Get the keyframe step key
    let keyText: string;
    let keyStart: number;
    let keyEnd: number;
    let isQuoted = false;

    if (ts.isStringLiteral(prop.name)) {
      keyText = prop.name.text;
      keyStart = prop.name.getStart(sourceFile) + 1; // Skip opening quote
      keyEnd = prop.name.getEnd() - 1; // Skip closing quote
      isQuoted = true;
    } else if (ts.isIdentifier(prop.name)) {
      keyText = prop.name.text;
      keyStart = prop.name.getStart(sourceFile);
      keyEnd = prop.name.getEnd();
    } else {
      continue;
    }

    // Check if this is a keyframe step (percentage or from/to)
    const isKeyframeStep = /^(\d+%(\s*,\s*\d+%)*|from|to)$/.test(keyText);
    
    if (isKeyframeStep) {
      const keyPos = document.positionAt(keyStart);
      // Use 'number' token type for keyframe percentages (matches numeric styling)
      builder.push(
        keyPos.line,
        keyPos.character,
        keyEnd - keyStart,
        tokenIndex('number'),
        0,
      );
    }

    // Process the keyframe step's style object
    if (ts.isObjectLiteralExpression(prop.initializer)) {
      processStyleObject(document, builder, prop.initializer, sourceFile, config, 1);
    }
  }
}

/**
 * Process a template literal expression.
 */
function processTemplateLiteral(
  document: TextDocument,
  builder: SemanticTokensBuilder,
  node: ts.TemplateExpression,
  sourceFile: ts.SourceFile,
  config: MergedConfig,
): void {
  // Process the head
  const headText = node.head.text;
  const headStart = node.head.getStart(sourceFile) + 1;
  processStyleValue(document, builder, headText, headStart, config);

  // Process template spans
  for (const span of node.templateSpans) {
    const spanText = span.literal.text;
    const spanStart = span.literal.getStart(sourceFile) + 1;
    processStyleValue(document, builder, spanText, spanStart, config);
  }
}
