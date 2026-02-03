/**
 * Tests for the Context Detector
 */

import * as ts from 'typescript';
import { detectContexts } from '../server/src/contextDetector';
import { TastyContextType } from '../shared/src/types';

function createSourceFile(code: string, filename = 'test.tsx'): ts.SourceFile {
  const scriptKind = filename.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  return ts.createSourceFile(
    filename,
    code,
    ts.ScriptTarget.Latest,
    true,
    scriptKind,
  );
}

describe('ContextDetector', () => {
  describe('Styles Type Annotation', () => {
    it('should detect variable with Styles type annotation', () => {
      const code = `
        import type { Styles } from './types';
        
        const myStyles: Styles = {
          padding: '2x',
          fill: '#primary',
        };
      `;
      const sourceFile = createSourceFile(code);
      const contexts = detectContexts(sourceFile, { enableHeuristics: true });
      
      // Should detect at least one context (Styles type or heuristic)
      expect(contexts.length).toBeGreaterThanOrEqual(1);
      
      // Check if any context matches StylesType or StylesVariable
      const hasStylesContext = contexts.some(
        c => c.context.type === TastyContextType.StylesType || 
             c.context.type === TastyContextType.StylesVariable
      );
      expect(hasStylesContext).toBe(true);
    });

    it('should detect exported variable with Styles type', () => {
      const code = `
        import type { Styles } from './types';
        
        export const BASE_TOKENS: Styles = {
          '$gap': '8px',
          '$radius': '6px',
        };
      `;
      const sourceFile = createSourceFile(code);
      const contexts = detectContexts(sourceFile, { enableHeuristics: true });
      
      expect(contexts.length).toBeGreaterThanOrEqual(1);
    });

    it('should detect Styles type in .ts file (not .tsx)', () => {
      const code = `
        import type { Styles } from '../tasty/styles/types';
        
        export const BASE_TOKENS: Styles = {
          '$gap': '8px',
          '$radius': '6px',
        };
      `;
      // Use .ts extension specifically
      const sourceFile = createSourceFile(code, 'test.ts');
      const contexts = detectContexts(sourceFile, { enableHeuristics: true });
      
      expect(contexts.length).toBeGreaterThanOrEqual(1);
      
      // Should detect as StylesType or StylesVariable
      const hasContext = contexts.some(
        c => c.context.type === TastyContextType.StylesType || 
             c.context.type === TastyContextType.StylesVariable
      );
      expect(hasContext).toBe(true);
    });
  });

  describe('Heuristic Detection', () => {
    it('should detect variable ending with styles (lowercase)', () => {
      const code = `
        const buttonStyles = {
          padding: '2x',
        };
      `;
      const sourceFile = createSourceFile(code);
      const contexts = detectContexts(sourceFile, { enableHeuristics: true });
      
      expect(contexts.length).toBe(1);
      expect(contexts[0].context.type).toBe(TastyContextType.StylesVariable);
    });

    it('should detect variable ending with Styles (camelCase)', () => {
      const code = `
        const buttonStyles = {
          padding: '2x',
        };
      `;
      const sourceFile = createSourceFile(code);
      const contexts = detectContexts(sourceFile, { enableHeuristics: true });
      
      expect(contexts.length).toBe(1);
    });

    it('should detect variable ending with STYLES (uppercase)', () => {
      const code = `
        const DEFAULT_BUTTON_STYLES = {
          padding: '2x',
        };
      `;
      const sourceFile = createSourceFile(code);
      const contexts = detectContexts(sourceFile, { enableHeuristics: true });
      
      expect(contexts.length).toBe(1);
      expect(contexts[0].context.type).toBe(TastyContextType.StylesVariable);
    });

    it('should detect variable ending with TOKENS (uppercase)', () => {
      const code = `
        export const BASE_TOKENS = {
          '$gap': '8px',
        };
      `;
      const sourceFile = createSourceFile(code);
      const contexts = detectContexts(sourceFile, { enableHeuristics: true });
      
      expect(contexts.length).toBe(1);
      expect(contexts[0].context.type).toBe(TastyContextType.StylesVariable);
    });

    it('should detect variable ending with Tokens (camelCase)', () => {
      const code = `
        const colorTokens = {
          '#primary': '#purple',
        };
      `;
      const sourceFile = createSourceFile(code);
      const contexts = detectContexts(sourceFile, { enableHeuristics: true });
      
      expect(contexts.length).toBe(1);
    });

    it('should not detect without heuristics enabled', () => {
      const code = `
        const buttonStyles = {
          padding: '2x',
        };
      `;
      const sourceFile = createSourceFile(code);
      const contexts = detectContexts(sourceFile, { enableHeuristics: false });
      
      expect(contexts.length).toBe(0);
    });
  });

  describe('Real file patterns', () => {
    it('should detect multiple Styles variables in item-themes.ts pattern', () => {
      const code = `
import { Styles } from 'src/tasty';

export const VALIDATION_STYLES: Styles = {
  border: {
    invalid: '#danger-text',
    valid: '#success-text',
  } as Record<string, string>,
} as const;

export const ITEM_ACTION_BASE_STYLES: Styles = {
  display: 'inline-grid',
  flow: 'column',
  padding: 0,
};

export const DEFAULT_PRIMARY_STYLES: Styles = {
  fill: '#primary',
  color: '#white',
};
      `;
      const sourceFile = createSourceFile(code, 'item-themes.ts');
      const contexts = detectContexts(sourceFile, { enableHeuristics: true });
      
      // Should detect 3 or 6 contexts (3 from Styles type + 3 from heuristic STYLES suffix)
      expect(contexts.length).toBeGreaterThanOrEqual(3);
      
      // Check that we have StylesType contexts
      const stylesTypeContexts = contexts.filter(c => c.context.type === TastyContextType.StylesType);
      expect(stylesTypeContexts.length).toBe(3);
    });

    it('should detect type with "as const" suffix', () => {
      const code = `
import { Styles } from 'src/tasty';

export const VALIDATION_STYLES: Styles = {
  border: '#red',
} as const;
      `;
      const sourceFile = createSourceFile(code, 'test.ts');
      const contexts = detectContexts(sourceFile, { enableHeuristics: true });
      
      expect(contexts.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('tasty() Call Detection', () => {
    it('should detect tasty() call with styles', () => {
      const code = `
        import { tasty } from '@cube-dev/ui-kit';
        
        const Button = tasty({
          styles: {
            padding: '2x',
          },
        });
      `;
      const sourceFile = createSourceFile(code);
      const contexts = detectContexts(sourceFile);
      
      expect(contexts.length).toBe(1);
      expect(contexts[0].context.type).toBe(TastyContextType.TastyStyles);
    });

    it('should detect tastyStatic() call', () => {
      const code = `
        import { tastyStatic } from '@cube-dev/ui-kit/tasty/static';
        
        const cardStyle = tastyStatic({
          padding: '4x',
          fill: '#white',
        });
      `;
      const sourceFile = createSourceFile(code);
      const contexts = detectContexts(sourceFile);
      
      expect(contexts.length).toBe(1);
      expect(contexts[0].context.type).toBe(TastyContextType.StaticStyles);
    });
  });
});
