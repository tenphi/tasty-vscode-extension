/**
 * End-to-end tests for the completion flow.
 *
 * Tests the complete pipeline:
 *   Document text → Context detection → Position context → Completion context → Completions
 *
 * This helps identify whether autocomplete issues are server-side or client-side.
 */

import * as ts from 'typescript';
import { detectContexts, DetectedStyleObject } from '../server/src/contextDetector';
import {
  getContextAtPosition,
  toCompletionContext,
  findContainingContext,
} from '../server/src/contextResolver';
import { getCompletions } from '../server/src/completion';
import { collectLocalDefinitions } from '../server/src/localDefinitions';
import { createEmptyConfig, MergedConfig } from '../shared/src/configTypes';

function createSourceFile(code: string, filename = 'test.ts'): ts.SourceFile {
  const scriptKind = filename.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  return ts.createSourceFile(filename, code, ts.ScriptTarget.Latest, true, scriptKind);
}

interface Position {
  line: number;
  character: number;
}

/**
 * Minimal TextDocument implementation for testing.
 */
function createTextDocument(code: string) {
  const lines = code.split('\n');
  return {
    getText: () => code,
    offsetAt: (pos: Position): number => {
      let offset = 0;
      for (let i = 0; i < pos.line; i++) {
        offset += lines[i].length + 1; // +1 for newline
      }
      offset += pos.character;
      return offset;
    },
    positionAt: (offset: number): Position => {
      let remaining = offset;
      for (let i = 0; i < lines.length; i++) {
        if (remaining <= lines[i].length) {
          return { line: i, character: remaining };
        }
        remaining -= lines[i].length + 1;
      }
      return { line: lines.length - 1, character: lines[lines.length - 1].length };
    },
  };
}

/**
 * Find the position of a marker `|` in the code and return the position + cleaned code.
 */
function findCursorPosition(codeWithMarker: string): { code: string; position: Position } {
  const markerIndex = codeWithMarker.indexOf('|');
  if (markerIndex === -1) {
    throw new Error('No cursor marker "|" found in code');
  }

  const code = codeWithMarker.slice(0, markerIndex) + codeWithMarker.slice(markerIndex + 1);
  const beforeMarker = codeWithMarker.slice(0, markerIndex);
  const lines = beforeMarker.split('\n');
  const line = lines.length - 1;
  const character = lines[lines.length - 1].length;

  return { code, position: { line, character } };
}

/**
 * Full completion flow helper.
 */
function getCompletionFlow(
  codeWithMarker: string,
  config: MergedConfig,
  filename = 'test.ts',
) {
  const { code, position } = findCursorPosition(codeWithMarker);
  const document = createTextDocument(code);
  const sourceFile = createSourceFile(code, filename);
  const contexts = detectContexts(sourceFile, { enableHeuristics: true });
  const localDefs = collectLocalDefinitions(contexts, sourceFile);

  const offset = document.offsetAt(position);

  // Check if offset falls within any context
  const containingContext = findContainingContext(offset, contexts);

  const positionContext = getContextAtPosition(
    document as any, // Cast: our mock implements the required methods
    position as any,
    sourceFile,
    contexts,
  );
  const completionContext = toCompletionContext(positionContext, position as any);
  const items = getCompletions(completionContext, config, localDefs);

  return {
    contexts,
    containingContext,
    localDefs,
    positionContext,
    completionContext,
    items,
    position,
    offset,
  };
}

describe('Completion Flow - State Binding Values', () => {
  let config: MergedConfig;

  beforeEach(() => {
    config = {
      ...createEmptyConfig(),
      tokens: ['#primary', '#danger', '#success', '#dark-01', '$gap', '$spacing', '$sidebar-width'],
      presets: ['h1', 'h2', 't1'],
      states: ['@mobile'],
    };
  });

  describe('Simple property value (baseline)', () => {
    it('should provide color token completions for simple property value with #', () => {
      const result = getCompletionFlow(
        `const myStyles = {
  fill: '#|',
};`,
        config,
      );

      expect(result.containingContext).not.toBeNull();
      expect(result.positionContext).not.toBeNull();
      expect(result.positionContext!.type).toBe('propertyValue');
      expect(result.positionContext!.propertyName).toBe('fill');
      expect(result.positionContext!.inString).toBe(true);
      expect(result.completionContext.isPropertyValue).toBe(true);
      expect(result.items.length).toBeGreaterThan(0);

      const primaryItem = result.items.find(i => i.label === '#primary');
      expect(primaryItem).toBeDefined();
    });

    it('should provide color token completions for Styles-typed variable', () => {
      const result = getCompletionFlow(
        `import { Styles } from 'src/tasty';
export const MY_STYLES: Styles = {
  fill: '#|',
};`,
        config,
      );

      expect(result.contexts.length).toBeGreaterThanOrEqual(1);
      expect(result.positionContext).not.toBeNull();
      expect(result.positionContext!.type).toBe('propertyValue');
      expect(result.completionContext.isPropertyValue).toBe(true);
      expect(result.items.length).toBeGreaterThan(0);
    });
  });

  describe('State binding values (the bug scenario)', () => {
    it('should provide color token completions for simple state key', () => {
      const result = getCompletionFlow(
        `const myStyles = {
  fill: {
    '': '#primary',
    'hovered': '#|',
  },
};`,
        config,
      );

      expect(result.containingContext).not.toBeNull();
      expect(result.positionContext).not.toBeNull();
      expect(result.positionContext!.type).toBe('propertyValue');
      expect(result.positionContext!.inString).toBe(true);
      expect(result.completionContext.isPropertyValue).toBe(true);
      expect(result.items.length).toBeGreaterThan(0);

      const primaryItem = result.items.find(i => i.label === '#primary');
      expect(primaryItem).toBeDefined();
    });

    it('should provide color token completions for pseudo-class state key value', () => {
      const result = getCompletionFlow(
        `const myStyles = {
  fill: {
    '': '#primary',
    ':hover': '#|',
  },
};`,
        config,
      );

      expect(result.positionContext).not.toBeNull();
      expect(result.positionContext!.type).toBe('propertyValue');
      expect(result.completionContext.isPropertyValue).toBe(true);
      expect(result.items.length).toBeGreaterThan(0);
    });

    it('should provide color token completions inside complex state key value', () => {
      const result = getCompletionFlow(
        `const myStyles = {
  margin: {
    '': '0 1bw 0 1bw',
    ':last-child & !:first-child': '0 $side-padding 0 0',
    ':last-child & :first-child': '0 #|',
  },
};`,
        config,
      );

      expect(result.containingContext).not.toBeNull();
      expect(result.positionContext).not.toBeNull();
      expect(result.positionContext!.type).toBe('propertyValue');
      expect(result.positionContext!.inString).toBe(true);
      expect(result.completionContext.isPropertyValue).toBe(true);
      expect(result.completionContext.textBefore).toBe('0 #');
      expect(result.completionContext.currentToken).toBe('#');
      expect(result.items.length).toBeGreaterThan(0);

      const primaryItem = result.items.find(i => i.label === '#primary');
      expect(primaryItem).toBeDefined();
    });

    it('should provide color token completions in the exact item-themes.ts scenario', () => {
      const result = getCompletionFlow(
        `import { Styles } from 'src/tasty';
export const ITEM_ACTION_BASE_STYLES: Styles = {
  display: 'inline-grid',
  flow: 'column',
  gap: 0,
  position: 'relative',
  margin: {
    '': '0 1bw 0 1bw',
    ':last-child & !:first-child': '0 $side-padding 0 0',
    '!:last-child & :first-child': '0 0 0 $side-padding',
    ':last-child & :first-child': '0 #| $sidebar-width',
    context: '0',
  },
  padding: 0,
};`,
        config,
      );

      // Step 1: Verify context detection
      expect(result.contexts.length).toBeGreaterThanOrEqual(1);
      expect(result.containingContext).not.toBeNull();

      // Step 2: Verify position context
      expect(result.positionContext).not.toBeNull();
      expect(result.positionContext!.type).toBe('propertyValue');
      expect(result.positionContext!.inString).toBe(true);

      // Step 3: Verify completion context
      expect(result.completionContext.isPropertyValue).toBe(true);
      expect(result.completionContext.textBefore).toBe('0 #');
      expect(result.completionContext.currentToken).toBe('#');

      // Step 4: Verify completion items
      expect(result.items.length).toBeGreaterThan(0);
      const primaryItem = result.items.find(i => i.label === '#primary');
      expect(primaryItem).toBeDefined();
    });

    it('should provide $ token completions inside a state binding value', () => {
      const result = getCompletionFlow(
        `const myStyles = {
  margin: {
    '': '0',
    'hovered': '0 $|',
  },
};`,
        config,
      );

      expect(result.positionContext).not.toBeNull();
      expect(result.positionContext!.type).toBe('propertyValue');
      expect(result.completionContext.isPropertyValue).toBe(true);
      expect(result.items.length).toBeGreaterThan(0);

      const gapItem = result.items.find(i => i.label === '$gap');
      expect(gapItem).toBeDefined();
    });

    it('should provide completions after text and space in state binding value', () => {
      const result = getCompletionFlow(
        `const myStyles = {
  padding: {
    '': '2x',
    ':hover': '0 #| 0',
  },
};`,
        config,
      );

      expect(result.positionContext).not.toBeNull();
      expect(result.positionContext!.type).toBe('propertyValue');
      expect(result.positionContext!.inString).toBe(true);
      expect(result.completionContext.isPropertyValue).toBe(true);
      expect(result.completionContext.textBefore).toBe('0 #');
      expect(result.completionContext.currentToken).toBe('#');
      expect(result.items.length).toBeGreaterThan(0);
    });
  });

  describe('State key detection (should NOT be propertyValue)', () => {
    it('should detect state key context when cursor is in the KEY of a state binding', () => {
      const result = getCompletionFlow(
        `const myStyles = {
  fill: {
    'hovered|': '#primary',
  },
};`,
        config,
      );

      expect(result.positionContext).not.toBeNull();
      expect(result.positionContext!.type).toBe('stateKey');
      expect(result.completionContext.isStateKey).toBe(true);
    });
  });
});
