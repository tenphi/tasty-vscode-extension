/**
 * Diagnostics Provider
 *
 * Provides validation and error checking for tasty styles.
 */

import * as ts from 'typescript';
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { MergedConfig } from '../../shared/src/configTypes';
import { DetectedStyleObject, DetectedJsxStyleProp, getStyleProperties } from './contextDetector';
import { parseValue } from './tastyParser';
import { parseStateKey } from './stateParser';
import { TastyTokenType } from '../../shared/src/types';
import { BUILT_IN_UNITS, ALL_STYLE_PROPERTIES, CSS_GLOBAL_VALUES, RESERVED_COLOR_TOKENS, CSS_FUNCTIONS, PRESET_MODIFIERS } from './builtins';
import { collectLocalDefinitions, LocalDefinitions, createEmptyLocalDefinitions } from './localDefinitions';

/**
 * Calculate Levenshtein distance between two strings.
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  
  // Initialize first column
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  // Initialize first row
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  // Fill in the rest
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

/**
 * Find similar tokens to suggest "Did you mean X?"
 * Returns the closest match if within threshold, or undefined.
 */
function findSimilarToken(unknown: string, validTokens: string[], maxDistance: number = 3): string | undefined {
  let bestMatch: string | undefined;
  let bestDistance = maxDistance + 1;
  
  for (const token of validTokens) {
    // Skip if length difference is too large
    if (Math.abs(token.length - unknown.length) > maxDistance) continue;
    
    const distance = levenshteinDistance(unknown.toLowerCase(), token.toLowerCase());
    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = token;
    }
  }
  
  return bestDistance <= maxDistance ? bestMatch : undefined;
}

/**
 * Create a diagnostic message with optional suggestion.
 */
function createUnknownTokenMessage(type: string, unknown: string, validTokens: string[]): string {
  const baseMessage = `Unknown ${type} '${unknown}'`;
  const suggestion = findSimilarToken(unknown, validTokens);
  
  if (suggestion) {
    return `${baseMessage}. Did you mean '${suggestion}'?`;
  }
  
  return baseMessage;
}

/**
 * Diagnostic codes.
 */
export const DiagnosticCode = {
  UnknownProperty: 'tasty/unknown-property',
  UnknownToken: 'tasty/unknown-token',
  UnknownUnit: 'tasty/unknown-unit',
  UnknownPreset: 'tasty/unknown-preset',
  UnknownPresetModifier: 'tasty/unknown-preset-modifier',
  UnknownStateAlias: 'tasty/unknown-state-alias',
  InvalidStateKey: 'tasty/invalid-state-key',
  DeprecatedProperty: 'tasty/deprecated-property',
  UnknownFunction: 'tasty/unknown-function',
  InvalidOpacity: 'tasty/invalid-opacity',
};

/**
 * Validate a document and return diagnostics.
 * Uses pre-parsed source file and contexts from the cache.
 */
export function validateDocument(
  document: TextDocument,
  sourceFile: ts.SourceFile,
  contexts: DetectedStyleObject[],
  config: MergedConfig,
  jsxStyleProps: DetectedJsxStyleProp[] = [],
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  // Collect local definitions from all contexts first
  // This allows tokens/states defined in one tasty() call to be recognized in others
  const localDefs = collectLocalDefinitions(contexts, sourceFile);

  // Validate each style object context
  for (const { context, node } of contexts) {
    const contextDiagnostics = validateStyleObject(document, node, sourceFile, config, localDefs);
    diagnostics.push(...contextDiagnostics);
  }

  // Validate JSX style props (gap="2x", fill="#primary", etc.)
  for (const prop of jsxStyleProps) {
    const propDiagnostics = validateJsxStyleProp(document, prop, config, localDefs);
    diagnostics.push(...propDiagnostics);
  }

  return diagnostics;
}

/**
 * Validate a single JSX style prop value.
 */
function validateJsxStyleProp(
  document: TextDocument,
  prop: DetectedJsxStyleProp,
  config: MergedConfig,
  localDefs: LocalDefinitions,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  // Only validate string values for now
  if (prop.isStringValue && prop.value !== undefined) {
    // Value is inside quotes, so add 1 for the opening quote
    const valueOffset = prop.valueStart + 1;
    
    const valueDiagnostics = validateStyleValue(
      document,
      prop.value,
      valueOffset,
      prop.propName,
      config,
      localDefs,
    );
    diagnostics.push(...valueDiagnostics);
  }

  return diagnostics;
}

/**
 * Validate a style object.
 * @param isInsideSubElement - Whether we're inside a sub-element style block (for @own validation)
 */
function validateStyleObject(
  document: TextDocument,
  node: ts.ObjectLiteralExpression,
  sourceFile: ts.SourceFile,
  config: MergedConfig,
  localDefs: LocalDefinitions,
  isInsideSubElement: boolean = false,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const properties = getStyleProperties(node, sourceFile);

  for (const prop of properties) {
    // Handle special property types that have nested structure
    if (prop.isSubElement) {
      // Sub-elements (Capitalized) contain nested styles - pass true for isInsideSubElement
      if (ts.isObjectLiteralExpression(prop.value)) {
        diagnostics.push(...validateStyleObject(document, prop.value, sourceFile, config, localDefs, true));
      }
      continue;
    }
    
    // CSS selector affixes ('&::before', '& > div', etc.) contain nested styles
    if (prop.name.startsWith('&')) {
      if (ts.isObjectLiteralExpression(prop.value)) {
        diagnostics.push(...validateStyleObject(document, prop.value, sourceFile, config, localDefs, isInsideSubElement));
      }
      continue;
    }
    
    if (prop.name.startsWith('@')) {
      // Skip @keyframes and @properties - they have special structure, not style objects
      if (prop.name === '@keyframes' || prop.name === '@properties') {
        continue;
      }
      
      // @starting is a state that should only be used inside style mappings, not as a property key
      if (prop.name === '@starting') {
        diagnostics.push({
          severity: DiagnosticSeverity.Warning,
          range: {
            start: document.positionAt(prop.nameStart),
            end: document.positionAt(prop.nameEnd),
          },
          message: `'@starting' is a state modifier, not a property. Use it inside style value mappings like: opacity: { '': 1, '@starting': 0 }`,
          code: DiagnosticCode.InvalidStateKey,
          source: 'tasty',
        });
        continue;
      }
      
      // At-rules like @media - nested structure (recurse into nested styles)
      if (ts.isObjectLiteralExpression(prop.value)) {
        diagnostics.push(...validateStyleObject(document, prop.value, sourceFile, config, localDefs, isInsideSubElement));
      }
      continue;
    }
    
    if (prop.name.startsWith('#') || prop.name.startsWith('$')) {
      // Local token definitions - validate token references inside the value
      if (ts.isStringLiteral(prop.value) || ts.isNoSubstitutionTemplateLiteral(prop.value)) {
        const valueText = prop.value.text;
        const valueStart = prop.valueStart + 1; // Skip opening quote
        
        // Validate tokens used inside the definition value
        const valueDiagnostics = validateStyleValue(
          document,
          valueText,
          valueStart,
          prop.name,
          config,
          localDefs,
        );
        diagnostics.push(...valueDiagnostics);
      } else if (ts.isObjectLiteralExpression(prop.value)) {
        diagnostics.push(...validateTokenValueMapping(document, prop.value, sourceFile, config, localDefs, isInsideSubElement));
      }
      continue;
    }
    
    // Note: We don't skip based on isStateKey here because that would incorrectly
    // skip CSS properties like 'color', 'fill' which match the state key pattern.

    // Note: We don't validate property names because tasty supports all CSS properties
    // plus custom handlers. Validating would require maintaining a complete CSS property list.

    // Validate property value
    if (ts.isStringLiteral(prop.value) || ts.isNoSubstitutionTemplateLiteral(prop.value)) {
      const valueText = prop.value.text;
      const valueStart = prop.valueStart + 1; // Skip opening quote

      const valueDiagnostics = validateStyleValue(
        document,
        valueText,
        valueStart,
        prop.name,
        config,
        localDefs,
      );
      diagnostics.push(...valueDiagnostics);
    } else if (ts.isObjectLiteralExpression(prop.value)) {
      // State mapping - validate each state's value
      diagnostics.push(...validateStateMapping(document, prop.value, sourceFile, prop.name, config, localDefs, isInsideSubElement));
    }
  }

  return diagnostics;
}

/**
 * Extract key info (text, start, end) from a property assignment.
 * Used by both validateTokenValueMapping and validateStateMapping to avoid duplication.
 */
function extractKeyInfo(
  prop: ts.PropertyAssignment,
  sourceFile: ts.SourceFile,
): { keyText: string; keyStart: number; keyEnd: number } | null {
  if (ts.isStringLiteral(prop.name)) {
    return {
      keyText: prop.name.text,
      keyStart: prop.name.getStart(sourceFile) + 1,
      keyEnd: prop.name.getEnd() - 1,
    };
  } else if (ts.isIdentifier(prop.name)) {
    return {
      keyText: prop.name.text,
      keyStart: prop.name.getStart(sourceFile),
      keyEnd: prop.name.getEnd(),
    };
  }
  return null;
}

/**
 * Validate a mapping object (state mapping or token value mapping).
 * 
 * This is the shared implementation for both validateStateMapping and validateTokenValueMapping.
 * Both follow the same pattern:
 * 1. Iterate over properties in the object
 * 2. Extract and validate state keys (the object keys like '', 'hovered', '@media(...)')
 * 3. Validate string values using validateStyleValue
 * 
 * The only difference is the propertyName passed to validateStyleValue:
 * - For style properties: the actual property name (e.g., 'fill', 'padding')
 * - For token definitions: empty string (no property-specific validation)
 * 
 * State alias validation flow:
 * - validateStateKey() receives allStateAliases (config.states + localDefs.states)
 * - parseStateKey() tokenizes the state key, marking known aliases as StateAlias tokens
 * - Unknown @aliases are flagged with warnings
 */
function validateMappingObject(
  document: TextDocument,
  node: ts.ObjectLiteralExpression,
  sourceFile: ts.SourceFile,
  propertyName: string,
  config: MergedConfig,
  localDefs: LocalDefinitions,
  isInsideSubElement: boolean = false,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  for (const prop of node.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;

    // Extract and validate the state key
    const keyInfo = extractKeyInfo(prop, sourceFile);
    if (keyInfo) {
      const keyDiagnostics = validateStateKey(
        document,
        keyInfo.keyText,
        keyInfo.keyStart,
        config,
        localDefs,
        isInsideSubElement,
      );
      diagnostics.push(...keyDiagnostics);
    }

    // Validate string values
    if (ts.isStringLiteral(prop.initializer) || ts.isNoSubstitutionTemplateLiteral(prop.initializer)) {
      const valueText = prop.initializer.text;
      const valueStart = prop.initializer.getStart(sourceFile) + 1; // Skip opening quote

      const valueDiagnostics = validateStyleValue(
        document,
        valueText,
        valueStart,
        propertyName,
        config,
        localDefs,
      );
      diagnostics.push(...valueDiagnostics);
    }
  }

  return diagnostics;
}

/**
 * Validate a token value mapping object (for # and $ prefixed local tokens).
 * Keys are state conditions and values are token values.
 * Both keys (state syntax) and values (token references) are validated.
 */
function validateTokenValueMapping(
  document: TextDocument,
  node: ts.ObjectLiteralExpression,
  sourceFile: ts.SourceFile,
  config: MergedConfig,
  localDefs: LocalDefinitions,
  isInsideSubElement: boolean = false,
): Diagnostic[] {
  // Token definitions don't have a property-specific context, so pass empty string
  return validateMappingObject(document, node, sourceFile, '', config, localDefs, isInsideSubElement);
}

/**
 * Validate a state mapping object for a style property.
 * Keys are state conditions and values are style values.
 */
function validateStateMapping(
  document: TextDocument,
  node: ts.ObjectLiteralExpression,
  sourceFile: ts.SourceFile,
  propertyName: string,
  config: MergedConfig,
  localDefs: LocalDefinitions,
  isInsideSubElement: boolean = false,
): Diagnostic[] {
  return validateMappingObject(document, node, sourceFile, propertyName, config, localDefs, isInsideSubElement);
}

/**
 * Validate a single token and return diagnostics.
 * This is shared between validateStyleValue and recursive validation.
 */
function validateToken(
  document: TextDocument,
  token: import('../../shared/src/types').TastyToken,
  offset: number,
  propertyName: string,
  config: MergedConfig,
  localDefs: LocalDefinitions,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  // Validate color tokens
  if (token.type === TastyTokenType.ColorToken) {
    const tokenValue = token.value;
    const baseToken = tokenValue.split('.')[0];
    
    // Check for opacity suffix and validate range
    const opacityMatch = tokenValue.match(/\.(\d+)$/);
    if (opacityMatch) {
      const opacity = parseInt(opacityMatch[1], 10);
      // Opacity should be 0-100 (or 1-9 for shorthand like .5 = 50%)
      // Two-digit values like .50, .80 are 50%, 80%
      // Single digit values like .5, .8 are 50%, 80%
      // Three-digit values like .100 are exactly 100%
      if (opacity > 100) {
        diagnostics.push({
          severity: DiagnosticSeverity.Warning,
          range: {
            start: document.positionAt(offset + token.start),
            end: document.positionAt(offset + token.end),
          },
          message: `Invalid opacity value '${opacity}'. Opacity should be 0-100 (e.g., .5 for 50%, .80 for 80%)`,
          code: DiagnosticCode.InvalidOpacity,
          source: 'tasty',
        });
      }
    }
    
    // Validate token name (only if config.tokens is defined)
    if (Array.isArray(config.tokens)) {
      // Check reserved tokens (e.g., #current), config tokens, and locally-defined tokens
      const isReserved = RESERVED_COLOR_TOKENS.includes(baseToken);
      const isInConfig = config.tokens.includes(baseToken);
      const isLocal = localDefs.tokens.has(baseToken);
      
      if (!isReserved && !isInConfig && !isLocal) {
        // Build list of valid color tokens for suggestions
        const colorTokens = config.tokens.filter(t => t.startsWith('#'));
        const allColorTokens = [...colorTokens, ...Array.from(localDefs.tokens).filter(t => t.startsWith('#'))];
        
        diagnostics.push({
          severity: DiagnosticSeverity.Warning,
          range: {
            start: document.positionAt(offset + token.start),
            end: document.positionAt(offset + token.end),
          },
          message: createUnknownTokenMessage('color token', baseToken, allColorTokens),
          code: DiagnosticCode.UnknownToken,
          source: 'tasty',
        });
      }
    }
  }

  // Validate custom properties
  if (token.type === TastyTokenType.CustomProperty && Array.isArray(config.tokens)) {
    // Check both config tokens and locally-defined tokens
    const isInConfig = config.tokens.includes(token.value);
    const isLocal = localDefs.tokens.has(token.value);
    
    if (!isInConfig && !isLocal) {
      // Build list of valid custom properties for suggestions
      const customProps = config.tokens.filter(t => t.startsWith('$'));
      const allCustomProps = [...customProps, ...Array.from(localDefs.tokens).filter(t => t.startsWith('$'))];
      
      diagnostics.push({
        severity: DiagnosticSeverity.Warning,
        range: {
          start: document.positionAt(offset + token.start),
          end: document.positionAt(offset + token.end),
        },
        message: createUnknownTokenMessage('custom property', token.value, allCustomProps),
        code: DiagnosticCode.UnknownToken,
        source: 'tasty',
      });
    }
  }

  // Validate units
  if (token.type === TastyTokenType.CustomUnit && Array.isArray(config.units)) {
    const unitMatch = token.value.match(/^[0-9.]+([a-z]+)$/);
    if (unitMatch) {
      const unit = unitMatch[1];
      if (!config.units.includes(unit) && !BUILT_IN_UNITS.includes(unit)) {
        const allUnits = [...config.units, ...BUILT_IN_UNITS];
        diagnostics.push({
          severity: DiagnosticSeverity.Warning,
          range: {
            start: document.positionAt(offset + token.start),
            end: document.positionAt(offset + token.end),
          },
          message: createUnknownTokenMessage('unit', unit, allUnits),
          code: DiagnosticCode.UnknownUnit,
          source: 'tasty',
        });
      }
    }
  }

  // Validate presets (for preset property)
  // Skip CSS global values like inherit, initial, unset, revert
  // Also validate preset modifiers (strong, italic, etc.)
  if (propertyName === 'preset' && token.type === TastyTokenType.Identifier) {
    const isValidPreset = config.presets.includes(token.value);
    const isPresetModifier = PRESET_MODIFIERS.includes(token.value);
    const isGlobalValue = CSS_GLOBAL_VALUES.includes(token.value);
    
    if (config.presets.length > 0 && !isValidPreset && !isPresetModifier && !isGlobalValue) {
      const allPresetsAndModifiers = [...config.presets, ...PRESET_MODIFIERS];
      diagnostics.push({
        severity: DiagnosticSeverity.Warning,
        range: {
          start: document.positionAt(offset + token.start),
          end: document.positionAt(offset + token.end),
        },
        message: createUnknownTokenMessage('preset or modifier', token.value, allPresetsAndModifiers),
        code: DiagnosticCode.UnknownPreset,
        source: 'tasty',
      });
    }
  }

  // Validate functions (when config.funcs is defined)
  if (token.type === TastyTokenType.Function && Array.isArray(config.funcs)) {
    const isBuiltInFunc = CSS_FUNCTIONS.includes(token.value);
    const isConfigFunc = config.funcs.includes(token.value);
    
    if (!isBuiltInFunc && !isConfigFunc) {
      const allFuncs = [...config.funcs, ...CSS_FUNCTIONS];
      diagnostics.push({
        severity: DiagnosticSeverity.Warning,
        range: {
          start: document.positionAt(offset + token.start),
          end: document.positionAt(offset + token.end),
        },
        message: createUnknownTokenMessage('function', token.value, allFuncs),
        code: DiagnosticCode.UnknownFunction,
        source: 'tasty',
      });
    }
  }

  // Recursively validate children
  if (token.children) {
    for (const child of token.children) {
      diagnostics.push(...validateToken(document, child, offset, propertyName, config, localDefs));
    }
  }

  return diagnostics;
}

/**
 * Validate a style value string.
 */
function validateStyleValue(
  document: TextDocument,
  value: string,
  offset: number,
  propertyName: string,
  config: MergedConfig,
  localDefs: LocalDefinitions,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  const tokens = parseValue(value, {
    tokens: config.tokens,
    units: Array.isArray(config.units) ? config.units : undefined,
    presets: config.presets,
  });

  for (const token of tokens) {
    diagnostics.push(...validateToken(document, token, offset, propertyName, config, localDefs));
  }

  return diagnostics;
}

/**
 * Validate a state key.
 */
function validateStateKey(
  document: TextDocument,
  key: string,
  offset: number,
  config: MergedConfig,
  localDefs: LocalDefinitions,
  isInsideSubElement: boolean = false,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  // Empty string is valid (default state)
  if (key === '') {
    return diagnostics;
  }

  // Skip validation for color token bindings (e.g., '#tabs-fade-left')
  // These are custom modifiers that can be user-defined
  if (key.startsWith('#')) {
    return diagnostics;
  }

  // Check for unbalanced parentheses
  const parenDiagnostics = validateParenthesesBalance(document, key, offset);
  diagnostics.push(...parenDiagnostics);

  // Combine config states with local state aliases
  const allStateAliases = [...config.states, ...localDefs.states];

  // Parse the state key
  const tokens = parseStateKey(key, allStateAliases);

  // Check for unknown tokens and state aliases
  for (const token of tokens) {
    if (token.type === TastyTokenType.Unknown) {
      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: {
          start: document.positionAt(offset + token.start),
          end: document.positionAt(offset + token.end),
        },
        message: `Invalid state key syntax at '${token.value}'`,
        code: DiagnosticCode.InvalidStateKey,
        source: 'tasty',
      });
    }
    
    // Validate @own usage - should only be inside sub-element style blocks
    if (token.type === TastyTokenType.OwnState && !isInsideSubElement) {
      diagnostics.push({
        severity: DiagnosticSeverity.Warning,
        range: {
          start: document.positionAt(offset + token.start),
          end: document.positionAt(offset + token.end),
        },
        message: `'@own(...)' should only be used inside sub-element style blocks. At root level, use the inner condition directly.`,
        code: DiagnosticCode.InvalidStateKey,
        source: 'tasty',
      });
    }
    
    // Validate state aliases (e.g., @mobile, @state)
    if (token.type === TastyTokenType.StateAlias) {
      const aliasName = token.value; // e.g., '@mobile', '@state'
      const isInConfig = config.states.includes(aliasName);
      const isLocal = localDefs.states.has(aliasName);
      
      if (!isInConfig && !isLocal) {
        diagnostics.push({
          severity: DiagnosticSeverity.Warning,
          range: {
            start: document.positionAt(offset + token.start),
            end: document.positionAt(offset + token.end),
          },
          message: `Unknown state alias '${aliasName}'`,
          code: DiagnosticCode.UnknownStateAlias,
          source: 'tasty',
        });
      }
    }
  }

  return diagnostics;
}

/**
 * Validate parentheses balance in a state key.
 */
function validateParenthesesBalance(
  document: TextDocument,
  key: string,
  offset: number,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const stack: { char: string; pos: number }[] = [];
  const pairs: Record<string, string> = { '(': ')', '[': ']' };
  const closers: Record<string, string> = { ')': '(', ']': '[' };

  for (let i = 0; i < key.length; i++) {
    const char = key[i];

    if (char === '(' || char === '[') {
      stack.push({ char, pos: i });
    } else if (char === ')' || char === ']') {
      const expected = closers[char];
      if (stack.length === 0) {
        // Unmatched closing bracket
        diagnostics.push({
          severity: DiagnosticSeverity.Error,
          range: {
            start: document.positionAt(offset + i),
            end: document.positionAt(offset + i + 1),
          },
          message: `Unmatched '${char}' - no opening '${expected}'`,
          code: DiagnosticCode.InvalidStateKey,
          source: 'tasty',
        });
      } else {
        const top = stack.pop()!;
        if (pairs[top.char] !== char) {
          // Mismatched brackets
          diagnostics.push({
            severity: DiagnosticSeverity.Error,
            range: {
              start: document.positionAt(offset + i),
              end: document.positionAt(offset + i + 1),
            },
            message: `Mismatched '${char}' - expected '${pairs[top.char]}' to close '${top.char}' at position ${top.pos}`,
            code: DiagnosticCode.InvalidStateKey,
            source: 'tasty',
          });
        }
      }
    }
  }

  // Report unclosed brackets
  for (const unclosed of stack) {
    diagnostics.push({
      severity: DiagnosticSeverity.Error,
      range: {
        start: document.positionAt(offset + unclosed.pos),
        end: document.positionAt(offset + unclosed.pos + 1),
      },
      message: `Unclosed '${unclosed.char}' - missing '${pairs[unclosed.char]}'`,
      code: DiagnosticCode.InvalidStateKey,
      source: 'tasty',
    });
  }

  return diagnostics;
}

