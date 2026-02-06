/**
 * Context Resolver
 *
 * Provides unified AST-based position context resolution
 * for completions, hover, and other features.
 */

import * as ts from 'typescript';
import { Position } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DetectedStyleObject, DetectedJsxStyleProp, getStyleProperties } from './contextDetector';

/**
 * Types of position contexts within tasty styles.
 */
export type PositionContextType =
  | 'propertyName'
  | 'propertyValue'
  | 'stateKey'
  | 'stateValue'
  | 'subElement'
  | 'atRule'
  | 'tokenDefinition'
  | 'selectorAffix'
  | 'unknown';

/**
 * Context information for a position within tasty styles.
 */
export interface PositionContext {
  /** The type of context */
  type: PositionContextType;
  /** The property name if we're in a value context */
  propertyName?: string;
  /** The containing style object node */
  containingObject: ts.ObjectLiteralExpression;
  /** The containing property assignment if any */
  containingProperty?: ts.PropertyAssignment;
  /** Text before the cursor position within the current token */
  textBefore: string;
  /** Offset within the document */
  offset: number;
  /** Whether we're inside a string literal */
  inString: boolean;
  /** The string content if inside a string */
  stringContent?: string;
  /** Position within the string content */
  stringOffset?: number;
}

/**
 * Find the style context that contains the given offset.
 */
export function findContainingContext(
  offset: number,
  contexts: DetectedStyleObject[],
): DetectedStyleObject | null {
  for (const ctx of contexts) {
    if (offset >= ctx.context.start && offset <= ctx.context.end) {
      return ctx;
    }
  }
  return null;
}

/**
 * Find the JSX style prop that contains the given offset.
 * Returns null if cursor is not inside a JSX style prop value.
 */
export function findContainingJsxStyleProp(
  offset: number,
  jsxStyleProps: DetectedJsxStyleProp[],
): DetectedJsxStyleProp | null {
  for (const prop of jsxStyleProps) {
    // Check if offset is within the value (between quotes or braces)
    if (offset >= prop.valueStart && offset <= prop.valueEnd) {
      return prop;
    }
  }
  return null;
}

/**
 * Get the context at a specific position within a document.
 */
export function getContextAtPosition(
  document: TextDocument,
  position: Position,
  sourceFile: ts.SourceFile,
  styleContexts: DetectedStyleObject[],
): PositionContext | null {
  const offset = document.offsetAt(position);
  const text = document.getText();

  // Find which style context contains this position
  const containingContext = findContainingContext(offset, styleContexts);
  if (!containingContext) {
    return null;
  }

  // Find the specific node at this position
  const nodeInfo = findNodeAtOffset(containingContext.node, sourceFile, offset);
  if (!nodeInfo) {
    return null;
  }

  const { node, parent, propertyName, inString, stringContent, stringOffset, objectDepth } = nodeInfo;

  // Determine context type
  let type: PositionContextType = 'unknown';
  let textBefore = '';

  if (inString && stringContent !== undefined && stringOffset !== undefined) {
    textBefore = stringContent.slice(0, stringOffset);
  } else {
    // Get text before cursor on current line
    const lineStart = text.lastIndexOf('\n', offset - 1) + 1;
    textBefore = text.slice(lineStart, offset);
  }

  if (propertyName !== undefined) {
    // We're in a property context
    if (propertyName.startsWith('#') || propertyName.startsWith('$')) {
      if (propertyName === '$') {
        type = 'selectorAffix';
      } else {
        type = 'tokenDefinition';
      }
    } else if (propertyName.startsWith('@')) {
      // @keyframes and @properties are always special at-rule structures
      if (propertyName === '@keyframes' || propertyName === '@properties') {
        type = 'atRule';
      } else if (inString && isPropertyAssignmentKey(node, parent)) {
        // Editing a @-prefixed key: always stateKey
        // - Root level: state alias definition (e.g., '@mobile': ':hover') — suggest aliases to define
        // - Nested: state key usage (e.g., margin: { '@mobile': '0' }) — suggest aliases to use
        type = 'stateKey';
      } else if (inString) {
        // Editing the value of an @-prefixed property
        type = 'propertyValue';
      } else {
        type = 'atRule';
      }
    } else if (/^[A-Z]/.test(propertyName)) {
      type = 'subElement';
    } else if (inString && isPropertyAssignmentKey(node, parent)) {
      // Inside a quoted property key that looks like a state key
      type = 'stateKey';
    } else if (inString) {
      type = 'propertyValue';
    } else if (isPropertyName(node, parent)) {
      type = 'propertyName';
    } else {
      type = 'propertyValue';
    }
  } else if (isPropertyName(node, parent)) {
    type = 'propertyName';
  } else if (inString) {
    // Check if this string is a property key (state key) or value
    if (isPropertyAssignmentKey(node, parent)) {
      type = 'stateKey';
    } else {
      type = 'propertyValue';
    }
  }

  return {
    type,
    propertyName,
    containingObject: containingContext.node,
    containingProperty:
      parent && ts.isPropertyAssignment(parent) ? parent : undefined,
    textBefore,
    offset,
    inString,
    stringContent,
    stringOffset,
  };
}

/**
 * Node info result from findNodeAtOffset.
 */
interface NodeInfo {
  node: ts.Node;
  parent?: ts.Node;
  propertyName?: string;
  inString: boolean;
  stringContent?: string;
  stringOffset?: number;
  /** Nesting depth: 0 = root style object, 1+ = inside nested mapping/sub-element */
  objectDepth: number;
}

/**
 * Find the node at a specific offset within a style object.
 */
function findNodeAtOffset(
  root: ts.ObjectLiteralExpression,
  sourceFile: ts.SourceFile,
  offset: number,
): NodeInfo | null {
  let result: NodeInfo | null = null;

  function visit(node: ts.Node, parent?: ts.Node, currentPropertyName?: string, currentDepth: number = 0): void {
    const start = node.getStart(sourceFile);
    const end = node.getEnd();

    if (offset < start || offset > end) {
      return;
    }

    // Track nesting depth: increment when entering a nested ObjectLiteralExpression
    let depth = currentDepth;
    if (ts.isObjectLiteralExpression(node) && node !== root) {
      depth++;
    }

    // Track property name context
    let propName = currentPropertyName;
    if (ts.isPropertyAssignment(node) && node.name) {
      if (ts.isIdentifier(node.name)) {
        propName = node.name.text;
      } else if (ts.isStringLiteral(node.name)) {
        propName = node.name.text;
      }
    }

    // Check if we're inside a string literal
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const stringStart = start + 1; // Skip opening quote
      const stringEnd = end - 1; // Skip closing quote

      if (offset >= stringStart && offset <= stringEnd) {
        result = {
          node,
          parent,
          propertyName: propName,
          inString: true,
          stringContent: node.text,
          stringOffset: offset - stringStart,
          objectDepth: depth,
        };
        return;
      }
    }

    // Update result if this node contains the offset
    result = {
      node,
      parent,
      propertyName: propName,
      inString: false,
      objectDepth: depth,
    };

    // Recurse into children
    ts.forEachChild(node, (child) => visit(child, node, propName, depth));
  }

  visit(root);
  return result;
}

/**
 * Check if a node is in property name position.
 */
function isPropertyName(node: ts.Node, parent?: ts.Node): boolean {
  if (!parent) return false;

  if (ts.isPropertyAssignment(parent)) {
    return parent.name === node;
  }

  return false;
}

/**
 * Check if a string node is a property assignment key.
 */
function isPropertyAssignmentKey(node: ts.Node, parent?: ts.Node): boolean {
  if (!parent) return false;

  if (
    ts.isPropertyAssignment(parent) &&
    (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
  ) {
    return parent.name === node;
  }

  return false;
}

/**
 * Get completion context from a position context.
 * Used by the completion provider to determine what to suggest.
 */
export interface CompletionPositionContext {
  isPropertyName: boolean;
  isPropertyValue: boolean;
  isStateKey: boolean;
  propertyName?: string;
  textBefore: string;
  /** The current token being typed (for # and $ tokens) */
  currentToken?: string;
  /** Start offset of the current token within the string */
  tokenStartOffset?: number;
  /** End offset of the current token within the string */
  tokenEndOffset?: number;
  /** The cursor position in the document */
  position?: Position;
}

/**
 * Extract the current token from text before cursor.
 * Returns the token (e.g., "#dark-0" or "$item") and its start position.
 */
function extractCurrentToken(textBefore: string): { token: string; startOffset: number } | null {
  // Find the last # or $ and extract the token from there
  const hashIdx = textBefore.lastIndexOf('#');
  const dollarIdx = textBefore.lastIndexOf('$');
  
  // Use whichever is later (and exists)
  const prefixIdx = Math.max(hashIdx, dollarIdx);
  
  if (prefixIdx === -1) {
    return null;
  }
  
  // Check if there's a space between the prefix and any previous content
  // This indicates we're starting a new token
  const beforePrefix = textBefore.slice(0, prefixIdx);
  if (beforePrefix.length > 0 && !/\s$/.test(beforePrefix)) {
    // There's content right before the # or $ without a space
    // This might be part of a different construct, but for tokens we want to include it
  }
  
  // Extract from the prefix to end
  const token = textBefore.slice(prefixIdx);
  
  // Validate it looks like a token (starts with # or $ followed by valid chars)
  if (!/^[#$][a-zA-Z0-9_-]*$/.test(token)) {
    return null;
  }
  
  return { token, startOffset: prefixIdx };
}

export function toCompletionContext(ctx: PositionContext | null, position?: Position): CompletionPositionContext {
  if (!ctx) {
    return {
      isPropertyName: false,
      isPropertyValue: false,
      isStateKey: false,
      textBefore: '',
    };
  }

  // Extract current token if we're in a property value context
  let currentToken: string | undefined;
  let tokenStartOffset: number | undefined;
  let tokenEndOffset: number | undefined;

  if (ctx.type === 'propertyValue' || ctx.type === 'tokenDefinition' || ctx.type === 'selectorAffix') {
    const extracted = extractCurrentToken(ctx.textBefore);
    if (extracted) {
      currentToken = extracted.token;
      tokenStartOffset = extracted.startOffset;
      tokenEndOffset = ctx.textBefore.length;
    }
  }

  return {
    isPropertyName: ctx.type === 'propertyName',
    isPropertyValue:
      ctx.type === 'propertyValue' ||
      ctx.type === 'tokenDefinition' ||
      ctx.type === 'selectorAffix',
    isStateKey: ctx.type === 'stateKey',
    propertyName: ctx.propertyName,
    textBefore: ctx.textBefore,
    currentToken,
    tokenStartOffset,
    tokenEndOffset,
    position,
  };
}

/**
 * Get hover context from a position context.
 * Used by the hover provider.
 */
export interface HoverPositionContext {
  word: string;
  line: string;
  isPropertyName: boolean;
  isPropertyValue: boolean;
  propertyName?: string;
}

export function toHoverContext(
  ctx: PositionContext | null,
  document: TextDocument,
  position: Position,
): HoverPositionContext | null {
  if (!ctx) {
    return null;
  }

  const text = document.getText();
  const offset = document.offsetAt(position);

  // Get the current line
  const lineStart = text.lastIndexOf('\n', offset - 1) + 1;
  const lineEnd = text.indexOf('\n', offset);
  const lineText = text.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);

  // Get word at cursor
  const charPos = offset - lineStart;
  let wordStart = charPos;
  let wordEnd = charPos;

  // Expand to word boundaries (including # and $)
  while (wordStart > 0 && /[a-zA-Z0-9_#$.-]/.test(lineText[wordStart - 1])) {
    wordStart--;
  }
  while (wordEnd < lineText.length && /[a-zA-Z0-9_.-]/.test(lineText[wordEnd])) {
    wordEnd++;
  }

  const word = lineText.slice(wordStart, wordEnd);

  if (!word) {
    return null;
  }

  return {
    word,
    line: lineText,
    isPropertyName: ctx.type === 'propertyName',
    isPropertyValue: ctx.type === 'propertyValue' || ctx.type === 'tokenDefinition',
    propertyName: ctx.propertyName,
  };
}

/**
 * JSX style prop context for completion and hover.
 */
export interface JsxStylePropContext {
  /** The property name (e.g., 'gap', 'fill') */
  propertyName: string;
  /** Text before the cursor within the value */
  textBefore: string;
  /** The cursor offset within the value string */
  valueOffset: number;
  /** Whether we're inside a string literal value */
  isStringValue: boolean;
  /** The current token being typed (for # and $ tokens) */
  currentToken?: string;
  /** Start offset of the current token within textBefore */
  tokenStartOffset?: number;
  /** End offset of the current token within textBefore */
  tokenEndOffset?: number;
}

/**
 * Get the context for a position within a JSX style prop.
 */
export function getJsxStylePropContext(
  document: TextDocument,
  position: Position,
  prop: DetectedJsxStyleProp,
): JsxStylePropContext | null {
  const offset = document.offsetAt(position);
  
  // Only handle string values for now
  if (!prop.isStringValue) {
    return null;
  }
  
  // Value offset is 1 more than valueStart to skip opening quote
  const valueContentStart = prop.valueStart + 1;
  const valueContentEnd = prop.valueEnd - 1;
  
  // Check if cursor is within the value content (between quotes)
  if (offset < valueContentStart || offset > valueContentEnd) {
    return null;
  }
  
  // Get text before cursor within the value
  const valueOffset = offset - valueContentStart;
  const textBefore = prop.value?.slice(0, valueOffset) ?? '';
  
  // Extract current token
  let currentToken: string | undefined;
  let tokenStartOffset: number | undefined;
  let tokenEndOffset: number | undefined;
  
  const extracted = extractCurrentToken(textBefore);
  if (extracted) {
    currentToken = extracted.token;
    tokenStartOffset = extracted.startOffset;
    tokenEndOffset = textBefore.length;
  }
  
  return {
    propertyName: prop.propName,
    textBefore,
    valueOffset,
    isStringValue: true,
    currentToken,
    tokenStartOffset,
    tokenEndOffset,
  };
}

/**
 * Convert JSX style prop context to completion context.
 */
export function jsxPropToCompletionContext(
  jsxCtx: JsxStylePropContext | null,
  position?: Position,
): CompletionPositionContext {
  if (!jsxCtx) {
    return {
      isPropertyName: false,
      isPropertyValue: false,
      isStateKey: false,
      textBefore: '',
    };
  }
  
  return {
    isPropertyName: false,
    isPropertyValue: true,
    isStateKey: false,
    propertyName: jsxCtx.propertyName,
    textBefore: jsxCtx.textBefore,
    currentToken: jsxCtx.currentToken,
    tokenStartOffset: jsxCtx.tokenStartOffset,
    tokenEndOffset: jsxCtx.tokenEndOffset,
    position,
  };
}

/**
 * Convert JSX style prop context to hover context.
 */
export function jsxPropToHoverContext(
  document: TextDocument,
  position: Position,
  jsxCtx: JsxStylePropContext | null,
): HoverPositionContext | null {
  if (!jsxCtx) {
    return null;
  }
  
  const text = document.getText();
  const offset = document.offsetAt(position);
  
  // Get the current line
  const lineStart = text.lastIndexOf('\n', offset - 1) + 1;
  const lineEnd = text.indexOf('\n', offset);
  const lineText = text.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
  
  // Get word at cursor
  const charPos = offset - lineStart;
  let wordStart = charPos;
  let wordEnd = charPos;
  
  // Expand to word boundaries (including # and $)
  while (wordStart > 0 && /[a-zA-Z0-9_#$.-]/.test(lineText[wordStart - 1])) {
    wordStart--;
  }
  while (wordEnd < lineText.length && /[a-zA-Z0-9_.-]/.test(lineText[wordEnd])) {
    wordEnd++;
  }
  
  const word = lineText.slice(wordStart, wordEnd);
  
  if (!word) {
    return null;
  }
  
  return {
    word,
    line: lineText,
    isPropertyName: false,
    isPropertyValue: true,
    propertyName: jsxCtx.propertyName,
  };
}
