/**
 * Code Actions Provider
 *
 * Provides quick fixes and refactoring suggestions for tasty styles.
 */

import {
  CodeAction,
  CodeActionKind,
  Diagnostic,
  TextEdit,
  Range,
  Position,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DiagnosticCode } from './diagnostics';

/**
 * CSS property to Tasty property mappings for refactoring suggestions.
 */
const PROPERTY_REFACTORINGS: Record<string, { tastyProp: string; description: string }> = {
  backgroundColor: { tastyProp: 'fill', description: 'Use Tasty `fill` property' },
  borderRadius: { tastyProp: 'radius', description: 'Use Tasty `radius` property' },
  borderColor: { tastyProp: 'border', description: 'Use Tasty `border` property' },
  borderWidth: { tastyProp: 'border', description: 'Use Tasty `border` property' },
  borderStyle: { tastyProp: 'border', description: 'Use Tasty `border` property' },
};

/**
 * Get code actions for a document at a given range.
 */
export function getCodeActions(
  document: TextDocument,
  range: Range,
  diagnostics: Diagnostic[],
): CodeAction[] {
  const actions: CodeAction[] = [];

  // Process diagnostics in the range
  for (const diagnostic of diagnostics) {
    const diagnosticActions = getActionsForDiagnostic(document, diagnostic);
    actions.push(...diagnosticActions);
  }

  // Add refactoring suggestions based on the current line
  const refactoringActions = getRefactoringActions(document, range);
  actions.push(...refactoringActions);

  return actions;
}

/**
 * Get code actions for a specific diagnostic.
 */
function getActionsForDiagnostic(
  document: TextDocument,
  diagnostic: Diagnostic,
): CodeAction[] {
  const actions: CodeAction[] = [];
  const code = diagnostic.code as string | undefined;

  // Handle "Did you mean X?" suggestions for unknown tokens
  if (code === DiagnosticCode.UnknownToken || 
      code === DiagnosticCode.UnknownUnit ||
      code === DiagnosticCode.UnknownPreset ||
      code === DiagnosticCode.UnknownStateAlias) {
    
    // Extract suggestion from message if present
    const match = diagnostic.message.match(/Did you mean '([^']+)'\?/);
    if (match) {
      const suggestion = match[1];
      const action: CodeAction = {
        title: `Replace with '${suggestion}'`,
        kind: CodeActionKind.QuickFix,
        diagnostics: [diagnostic],
        edit: {
          changes: {
            [document.uri]: [
              TextEdit.replace(diagnostic.range, suggestion),
            ],
          },
        },
        isPreferred: true,
      };
      actions.push(action);
    }
  }

  return actions;
}

/**
 * Get refactoring actions for CSS property to Tasty property conversions.
 */
function getRefactoringActions(
  document: TextDocument,
  range: Range,
): CodeAction[] {
  const actions: CodeAction[] = [];
  const text = document.getText();
  const startOffset = document.offsetAt(range.start);
  const endOffset = document.offsetAt(range.end);

  // Get the line text
  const lineStart = text.lastIndexOf('\n', startOffset) + 1;
  const lineEnd = text.indexOf('\n', endOffset);
  const lineText = text.slice(lineStart, lineEnd === -1 ? text.length : lineEnd);

  // Check for CSS properties that can be refactored to Tasty properties
  for (const [cssProperty, { tastyProp, description }] of Object.entries(PROPERTY_REFACTORINGS)) {
    // Look for property pattern: propertyName: 'value' or propertyName: { ... }
    const propertyPattern = new RegExp(`\\b${cssProperty}\\s*:`);
    const match = lineText.match(propertyPattern);

    if (match && match.index !== undefined) {
      const propertyStart = lineStart + match.index;
      const propertyEnd = propertyStart + cssProperty.length;

      const action: CodeAction = {
        title: `Convert '${cssProperty}' to '${tastyProp}'`,
        kind: CodeActionKind.RefactorRewrite,
        edit: {
          changes: {
            [document.uri]: [
              TextEdit.replace(
                Range.create(
                  document.positionAt(propertyStart),
                  document.positionAt(propertyEnd),
                ),
                tastyProp,
              ),
            ],
          },
        },
      };
      actions.push(action);
    }
  }

  // Check for maxWidth/minWidth patterns that can be converted to width: "max/min ..."
  const widthPatterns = [
    { pattern: /\bmaxWidth\s*:\s*['"]([^'"]+)['"]/g, type: 'max' },
    { pattern: /\bminWidth\s*:\s*['"]([^'"]+)['"]/g, type: 'min' },
    { pattern: /\bmaxHeight\s*:\s*['"]([^'"]+)['"]/g, type: 'max', prop: 'height' },
    { pattern: /\bminHeight\s*:\s*['"]([^'"]+)['"]/g, type: 'min', prop: 'height' },
  ];

  for (const { pattern, type, prop } of widthPatterns) {
    pattern.lastIndex = 0;
    let widthMatch;
    while ((widthMatch = pattern.exec(lineText)) !== null) {
      const fullMatch = widthMatch[0];
      const value = widthMatch[1];
      const propName = prop || 'width';
      const cssProperty = type === 'max' 
        ? (prop ? 'maxHeight' : 'maxWidth')
        : (prop ? 'minHeight' : 'minWidth');

      const matchStart = lineStart + widthMatch.index;
      const matchEnd = matchStart + fullMatch.length;

      const action: CodeAction = {
        title: `Convert '${cssProperty}' to '${propName}: "${type} ${value}"'`,
        kind: CodeActionKind.RefactorRewrite,
        edit: {
          changes: {
            [document.uri]: [
              TextEdit.replace(
                Range.create(
                  document.positionAt(matchStart),
                  document.positionAt(matchEnd),
                ),
                `${propName}: '${type} ${value}'`,
              ),
            ],
          },
        },
      };
      actions.push(action);
    }
  }

  return actions;
}
