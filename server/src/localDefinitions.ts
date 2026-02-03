/**
 * Local Definitions Scanner
 *
 * Scans the current document for locally-defined tokens and states.
 * This allows the extension to recognize tokens/states defined in the same file
 * without requiring them to be in tasty.config.ts.
 */

import * as ts from 'typescript';
import { DetectedStyleObject, getStyleProperties } from './contextDetector';

/**
 * Local definitions found in a document.
 */
export interface LocalDefinitions {
  /** Token names defined locally ($name, #name) */
  tokens: Set<string>;
  /** State keys used in style mappings */
  states: Set<string>;
  /** Map of token name to its definition location (for go-to-definition) */
  tokenLocations: Map<string, { start: number; end: number }>;
  /** Map of state name to its first usage location */
  stateLocations: Map<string, { start: number; end: number }>;
}

/**
 * Create empty local definitions.
 */
export function createEmptyLocalDefinitions(): LocalDefinitions {
  return {
    tokens: new Set(),
    states: new Set(),
    tokenLocations: new Map(),
    stateLocations: new Map(),
  };
}

/**
 * Collect local token and state definitions from all detected style contexts.
 */
export function collectLocalDefinitions(
  contexts: DetectedStyleObject[],
  sourceFile: ts.SourceFile,
): LocalDefinitions {
  const result = createEmptyLocalDefinitions();

  for (const { node } of contexts) {
    collectFromStyleObject(node, sourceFile, result);
  }

  return result;
}

/**
 * Recursively collect definitions from a style object.
 */
function collectFromStyleObject(
  node: ts.ObjectLiteralExpression,
  sourceFile: ts.SourceFile,
  result: LocalDefinitions,
): void {
  for (const prop of node.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;

    // Get property name
    let name: string | undefined;
    let nameStart: number | undefined;
    let nameEnd: number | undefined;

    if (ts.isIdentifier(prop.name)) {
      name = prop.name.text;
      nameStart = prop.name.getStart(sourceFile);
      nameEnd = prop.name.getEnd();
    } else if (ts.isStringLiteral(prop.name)) {
      name = prop.name.text;
      nameStart = prop.name.getStart(sourceFile) + 1; // Skip opening quote
      nameEnd = prop.name.getEnd() - 1; // Skip closing quote
    }

    if (!name || nameStart === undefined || nameEnd === undefined) continue;

    // Collect token definitions ($ or # prefix)
    if (name.startsWith('$') || name.startsWith('#')) {
      // Skip special properties like @keyframes, @properties
      if (name.startsWith('@')) continue;

      result.tokens.add(name);
      if (!result.tokenLocations.has(name)) {
        result.tokenLocations.set(name, { start: nameStart, end: nameEnd });
      }

      // If the value is an object (state mapping for the token), recurse to collect states
      if (ts.isObjectLiteralExpression(prop.initializer)) {
        collectStatesFromMapping(prop.initializer, sourceFile, result);
      }
      continue;
    }

    // Handle sub-elements (Capitalized keys) - recurse into them
    if (/^[A-Z]/.test(name) && ts.isObjectLiteralExpression(prop.initializer)) {
      collectFromStyleObject(prop.initializer, sourceFile, result);
      continue;
    }
    
    // Handle CSS selector affixes ('&::before', '& > div', etc.) - recurse into them
    if (name.startsWith('&') && ts.isObjectLiteralExpression(prop.initializer)) {
      collectFromStyleObject(prop.initializer, sourceFile, result);
      continue;
    }

    // Handle @ prefixed properties
    if (name.startsWith('@')) {
      // @keyframes has animation definitions, skip it
      if (name === '@keyframes') {
        continue;
      }
      
      // @properties defines CSS @property rules - collect token names from it
      if (name === '@properties' && ts.isObjectLiteralExpression(prop.initializer)) {
        collectTokensFromProperties(prop.initializer, sourceFile, result);
        continue;
      }
      
      // Local state alias definition (e.g., '@state': ':hover')
      // These are string values that define what the alias maps to
      if (ts.isStringLiteral(prop.initializer) || ts.isNoSubstitutionTemplateLiteral(prop.initializer)) {
        result.states.add(name);
        if (!result.stateLocations.has(name)) {
          result.stateLocations.set(name, { start: nameStart, end: nameEnd });
        }
        continue;
      }
      
      // At-rules with nested styles (recurse into nested styles)
      if (ts.isObjectLiteralExpression(prop.initializer)) {
        collectFromStyleObject(prop.initializer, sourceFile, result);
      }
      continue;
    }

    // If value is an object, it's a state mapping - collect states from it
    if (ts.isObjectLiteralExpression(prop.initializer)) {
      collectStatesFromMapping(prop.initializer, sourceFile, result);
    }
  }
}

/**
 * Collect token names from @properties object.
 * @properties contains CSS @property definitions with keys like '$name' or '#name'.
 */
function collectTokensFromProperties(
  node: ts.ObjectLiteralExpression,
  sourceFile: ts.SourceFile,
  result: LocalDefinitions,
): void {
  for (const prop of node.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;

    let name: string | undefined;
    let nameStart: number | undefined;
    let nameEnd: number | undefined;

    if (ts.isIdentifier(prop.name)) {
      name = prop.name.text;
      nameStart = prop.name.getStart(sourceFile);
      nameEnd = prop.name.getEnd();
    } else if (ts.isStringLiteral(prop.name)) {
      name = prop.name.text;
      nameStart = prop.name.getStart(sourceFile) + 1;
      nameEnd = prop.name.getEnd() - 1;
    }

    if (!name || nameStart === undefined || nameEnd === undefined) continue;

    // Collect property names ($ or # prefix)
    if (name.startsWith('$') || name.startsWith('#')) {
      result.tokens.add(name);
      if (!result.tokenLocations.has(name)) {
        result.tokenLocations.set(name, { start: nameStart, end: nameEnd });
      }
    }
  }
}

/**
 * Collect state keys from a style mapping object.
 * NOTE: This function only collects state USAGE locations for go-to-definition,
 * NOT state definitions. State definitions are detected in collectFromStyleObject
 * when we see patterns like '@state': ':hover'.
 * We do NOT add usages to result.states - only actual definitions belong there.
 */
function collectStatesFromMapping(
  node: ts.ObjectLiteralExpression,
  sourceFile: ts.SourceFile,
  result: LocalDefinitions,
): void {
  // This function is intentionally a no-op for adding to result.states.
  // State usages in mapping keys (like '@state2' in 'size=xlarge | @state2')
  // should NOT be treated as definitions.
  // Only actual definitions (like '@state': ':hover') should be in result.states,
  // which is handled in collectFromStyleObject.
  
  // If we need location tracking for state usages in the future,
  // we can add it here without adding to result.states.
}

/**
 * Check if a token is defined locally.
 */
export function isLocalToken(token: string, localDefs: LocalDefinitions): boolean {
  return localDefs.tokens.has(token);
}

/**
 * Check if a state is used locally.
 */
export function isLocalState(state: string, localDefs: LocalDefinitions): boolean {
  return localDefs.states.has(state);
}

/**
 * Get the location of a local token definition.
 */
export function getTokenLocation(
  token: string,
  localDefs: LocalDefinitions,
): { start: number; end: number } | undefined {
  return localDefs.tokenLocations.get(token);
}

/**
 * Get the location of a local state usage.
 */
export function getStateLocation(
  state: string,
  localDefs: LocalDefinitions,
): { start: number; end: number } | undefined {
  return localDefs.stateLocations.get(state);
}
