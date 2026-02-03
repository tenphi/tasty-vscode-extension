/**
 * Context Detector
 *
 * Detects tasty style contexts in TypeScript/TSX files.
 * Uses TypeScript's compiler API to analyze the AST.
 */

import * as ts from 'typescript';
import { TastyContext, TastyContextType } from '../../shared/src/types';
import { isStateKey, isSubElement } from './stateParser';

/**
 * Detected style object with its location and context.
 */
export interface DetectedStyleObject {
  context: TastyContext;
  /** The object literal node */
  node: ts.ObjectLiteralExpression;
  /** Parent context (for nested objects) */
  parent?: DetectedStyleObject;
}

/**
 * Options for context detection.
 */
export interface DetectionOptions {
  /** Enable heuristic detection (variables ending with *styles) */
  enableHeuristics?: boolean;
  /** Track import aliases for tasty/tastyStatic */
  importAliases?: Map<string, 'tasty' | 'tastyStatic'>;
}

/**
 * Detect all tasty style contexts in a source file.
 */
export function detectContexts(
  sourceFile: ts.SourceFile,
  options: DetectionOptions = {},
): DetectedStyleObject[] {
  const results: DetectedStyleObject[] = [];
  const importAliases = options.importAliases ?? new Map<string, 'tasty' | 'tastyStatic'>();

  // First pass: find import declarations to track aliases
  findImportAliases(sourceFile, importAliases);

  // Second pass: find style contexts
  const visit = (node: ts.Node) => {
    // Check for tasty() call
    if (ts.isCallExpression(node)) {
      const tastyContexts = detectTastyCall(node, sourceFile, importAliases);
      results.push(...tastyContexts);
    }

    // Check for Styles type annotation
    if (ts.isVariableDeclaration(node) && node.type) {
      const stylesContext = detectStylesTypeAnnotation(node, sourceFile);
      if (stylesContext) {
        results.push(stylesContext);
      }
    }

    // Check for styles prop on JSX
    if (ts.isJsxAttribute(node)) {
      const propContext = detectStylesProp(node, sourceFile);
      if (propContext) {
        results.push(propContext);
      }
    }

    // Heuristic: variables ending with *styles/*Styles
    if (options.enableHeuristics && ts.isVariableDeclaration(node)) {
      const heuristicContext = detectStylesVariable(node, sourceFile);
      if (heuristicContext) {
        results.push(heuristicContext);
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return results;
}

/**
 * Find tasty/tastyStatic import aliases.
 */
function findImportAliases(
  sourceFile: ts.SourceFile,
  aliases: Map<string, 'tasty' | 'tastyStatic'>,
): void {
  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node) && node.moduleSpecifier) {
      const moduleName = (node.moduleSpecifier as ts.StringLiteral).text;

      // Check for tasty imports
      if (
        moduleName.includes('@cube-dev/ui-kit') ||
        moduleName.includes('tasty') ||
        moduleName === 'tasty'
      ) {
        const importClause = node.importClause;
        if (importClause?.namedBindings && ts.isNamedImports(importClause.namedBindings)) {
          for (const element of importClause.namedBindings.elements) {
            const importedName = element.propertyName?.text ?? element.name.text;
            const localName = element.name.text;

            if (importedName === 'tasty') {
              aliases.set(localName, 'tasty');
            } else if (importedName === 'tastyStatic') {
              aliases.set(localName, 'tastyStatic');
            }
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
}

/**
 * Detect tasty() or tastyStatic() call expressions.
 */
function detectTastyCall(
  node: ts.CallExpression,
  sourceFile: ts.SourceFile,
  importAliases: Map<string, 'tasty' | 'tastyStatic'>,
): DetectedStyleObject[] {
  const results: DetectedStyleObject[] = [];

  // Get the function name
  let funcName: string | undefined;
  if (ts.isIdentifier(node.expression)) {
    funcName = node.expression.text;
  } else if (ts.isPropertyAccessExpression(node.expression)) {
    funcName = node.expression.name.text;
  }

  if (!funcName) return results;

  // Check if it's a tasty function
  const funcType = importAliases.get(funcName) ?? (funcName === 'tasty' ? 'tasty' : funcName === 'tastyStatic' ? 'tastyStatic' : undefined);

  if (funcType === 'tasty') {
    results.push(...detectTastyFunctionCall(node, sourceFile));
  } else if (funcType === 'tastyStatic') {
    results.push(...detectTastyStaticCall(node, sourceFile));
  }

  return results;
}

/**
 * Detect styles in tasty() function call.
 */
function detectTastyFunctionCall(
  node: ts.CallExpression,
  sourceFile: ts.SourceFile,
): DetectedStyleObject[] {
  const results: DetectedStyleObject[] = [];
  const args = node.arguments;

  // tasty(config) or tasty(BaseComponent, config)
  const configArg = args.length === 1 ? args[0] : args.length === 2 ? args[1] : undefined;

  if (configArg && ts.isObjectLiteralExpression(configArg)) {
    // Look for styles, variants, tokens properties
    for (const prop of configArg.properties) {
      if (!ts.isPropertyAssignment(prop)) continue;

      const propName = prop.name && ts.isIdentifier(prop.name) ? prop.name.text : undefined;

      if (propName === 'styles' && ts.isObjectLiteralExpression(prop.initializer)) {
        results.push({
          context: {
            type: TastyContextType.TastyStyles,
            start: prop.initializer.getStart(sourceFile),
            end: prop.initializer.getEnd(),
          },
          node: prop.initializer,
        });
      } else if (propName === 'variants' && ts.isObjectLiteralExpression(prop.initializer)) {
        // Each variant value is a Styles object
        for (const variantProp of prop.initializer.properties) {
          if (
            ts.isPropertyAssignment(variantProp) &&
            ts.isObjectLiteralExpression(variantProp.initializer)
          ) {
            results.push({
              context: {
                type: TastyContextType.TastyVariants,
                start: variantProp.initializer.getStart(sourceFile),
                end: variantProp.initializer.getEnd(),
              },
              node: variantProp.initializer,
            });
          }
        }
      } else if (propName === 'tokens' && ts.isObjectLiteralExpression(prop.initializer)) {
        results.push({
          context: {
            type: TastyContextType.TastyTokens,
            start: prop.initializer.getStart(sourceFile),
            end: prop.initializer.getEnd(),
          },
          node: prop.initializer,
        });
      }
    }
  }

  return results;
}

/**
 * Detect styles in tastyStatic() function call.
 */
function detectTastyStaticCall(
  node: ts.CallExpression,
  sourceFile: ts.SourceFile,
): DetectedStyleObject[] {
  const results: DetectedStyleObject[] = [];
  const args = node.arguments;

  if (args.length === 0) return results;

  // tastyStatic(styles) - single object argument
  if (args.length === 1 && ts.isObjectLiteralExpression(args[0])) {
    results.push({
      context: {
        type: TastyContextType.StaticStyles,
        start: args[0].getStart(sourceFile),
        end: args[0].getEnd(),
      },
      node: args[0],
    });
  }

  // tastyStatic(base, styles) or tastyStatic('selector', styles)
  if (args.length === 2) {
    const firstArg = args[0];
    const secondArg = args[1];

    if (ts.isObjectLiteralExpression(secondArg)) {
      if (ts.isStringLiteral(firstArg) || ts.isNoSubstitutionTemplateLiteral(firstArg)) {
        // Selector mode: tastyStatic('body', {...})
        results.push({
          context: {
            type: TastyContextType.StaticSelector,
            start: secondArg.getStart(sourceFile),
            end: secondArg.getEnd(),
            selector: firstArg.text,
          },
          node: secondArg,
        });
      } else {
        // Extension mode: tastyStatic(baseStyle, {...})
        results.push({
          context: {
            type: TastyContextType.StaticExtension,
            start: secondArg.getStart(sourceFile),
            end: secondArg.getEnd(),
          },
          node: secondArg,
        });
      }
    }
  }

  return results;
}

/**
 * Unwrap an expression to find the underlying object literal.
 * Handles: `{ ... }`, `{ ... } as const`, `{ ... } as Record<...>`, etc.
 */
function unwrapToObjectLiteral(expr: ts.Expression): ts.ObjectLiteralExpression | undefined {
  // Direct object literal
  if (ts.isObjectLiteralExpression(expr)) {
    return expr;
  }
  // "as" expression: `{ ... } as const` or `{ ... } as SomeType`
  if (ts.isAsExpression(expr)) {
    return unwrapToObjectLiteral(expr.expression);
  }
  // Parenthesized expression: `({ ... })`
  if (ts.isParenthesizedExpression(expr)) {
    return unwrapToObjectLiteral(expr.expression);
  }
  // Type assertion (legacy syntax): `<SomeType>{ ... }`
  // Use SyntaxKind check as ts.isTypeAssertion may not exist in all TS versions
  if (expr.kind === ts.SyntaxKind.TypeAssertionExpression) {
    return unwrapToObjectLiteral((expr as ts.TypeAssertion).expression);
  }
  // Satisfies expression (TS 4.9+): `{ ... } satisfies SomeType`
  if (expr.kind === ts.SyntaxKind.SatisfiesExpression) {
    return unwrapToObjectLiteral((expr as any).expression);
  }
  return undefined;
}

/**
 * Detect Styles type annotation on variable.
 */
function detectStylesTypeAnnotation(
  node: ts.VariableDeclaration,
  sourceFile: ts.SourceFile,
): DetectedStyleObject | undefined {
  const typeNode = node.type;
  if (!typeNode) return undefined;

  // Check if type is "Styles" or contains "Styles"
  const typeText = typeNode.getText(sourceFile);
  if (!typeText.includes('Styles')) return undefined;

  // Check if initializer is an object literal (possibly wrapped in "as const", etc.)
  if (node.initializer) {
    const objectLiteral = unwrapToObjectLiteral(node.initializer);
    if (objectLiteral) {
      return {
        context: {
          type: TastyContextType.StylesType,
          start: objectLiteral.getStart(sourceFile),
          end: objectLiteral.getEnd(),
        },
        node: objectLiteral,
      };
    }
  }

  return undefined;
}

/**
 * Detect styles prop on JSX element.
 */
function detectStylesProp(
  node: ts.JsxAttribute,
  sourceFile: ts.SourceFile,
): DetectedStyleObject | undefined {
  const propName = node.name.getText(sourceFile);
  if (propName !== 'styles') return undefined;

  const initializer = node.initializer;
  if (!initializer) return undefined;

  // styles={{ ... }}
  if (ts.isJsxExpression(initializer) && initializer.expression) {
    if (ts.isObjectLiteralExpression(initializer.expression)) {
      return {
        context: {
          type: TastyContextType.StylesProp,
          start: initializer.expression.getStart(sourceFile),
          end: initializer.expression.getEnd(),
        },
        node: initializer.expression,
      };
    }
  }

  return undefined;
}

/**
 * Heuristic: detect variables ending with *styles/*Styles/*STYLES or *tokens/*Tokens/*TOKENS.
 * This allows token definition files to get syntax highlighting without tasty() calls.
 */
function detectStylesVariable(
  node: ts.VariableDeclaration,
  sourceFile: ts.SourceFile,
): DetectedStyleObject | undefined {
  const name = node.name;
  if (!ts.isIdentifier(name)) return undefined;

  const varName = name.text;
  // Match styles/Styles/STYLES or tokens/Tokens/TOKENS (case-insensitive)
  if (!/(?:styles|tokens)$/i.test(varName)) return undefined;

  // Check if initializer is an object literal (possibly wrapped in "as const", etc.)
  if (node.initializer) {
    const objectLiteral = unwrapToObjectLiteral(node.initializer);
    if (objectLiteral) {
      return {
        context: {
          type: TastyContextType.StylesVariable,
          start: objectLiteral.getStart(sourceFile),
          end: objectLiteral.getEnd(),
        },
        node: objectLiteral,
      };
    }
  }

  return undefined;
}

/**
 * Get all property assignments from a style object.
 */
export function getStyleProperties(
  node: ts.ObjectLiteralExpression,
  sourceFile: ts.SourceFile,
): Array<{
  name: string;
  nameStart: number;
  nameEnd: number;
  value: ts.Expression;
  valueStart: number;
  valueEnd: number;
  isSubElement: boolean;
  isStateKey: boolean;
}> {
  const properties: Array<{
    name: string;
    nameStart: number;
    nameEnd: number;
    value: ts.Expression;
    valueStart: number;
    valueEnd: number;
    isSubElement: boolean;
    isStateKey: boolean;
  }> = [];

  for (const prop of node.properties) {
    if (!ts.isPropertyAssignment(prop)) continue;

    let name: string;
    let nameStart: number;
    let nameEnd: number;

    if (ts.isIdentifier(prop.name)) {
      name = prop.name.text;
      nameStart = prop.name.getStart(sourceFile);
      nameEnd = prop.name.getEnd();
    } else if (ts.isStringLiteral(prop.name)) {
      name = prop.name.text;
      nameStart = prop.name.getStart(sourceFile);
      nameEnd = prop.name.getEnd();
    } else if (ts.isComputedPropertyName(prop.name)) {
      // Skip computed property names
      continue;
    } else {
      continue;
    }

    properties.push({
      name,
      nameStart,
      nameEnd,
      value: prop.initializer,
      valueStart: prop.initializer.getStart(sourceFile),
      valueEnd: prop.initializer.getEnd(),
      isSubElement: isSubElement(name),
      isStateKey: isStateKey(name),
    });
  }

  return properties;
}

/**
 * Get the string value from a string literal or template literal.
 */
export function getStringValue(node: ts.Expression): string | undefined {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  return undefined;
}
