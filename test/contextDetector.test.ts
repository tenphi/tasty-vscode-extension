/**
 * Tests for the Context Detector
 */

import * as ts from 'typescript';
import { detectContexts, detectAllJsxStyleProps, isStyleProperty } from '../server/src/contextDetector';
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

  describe('JSX Style Props Detection', () => {
    it('should detect JSX style props on components', () => {
      const code = `
        const Component = () => (
          <Flex gap="2x" fill="#primary" padding="1x">
            Hello
          </Flex>
        );
      `;
      const sourceFile = createSourceFile(code);
      const jsxStyleProps = detectAllJsxStyleProps(sourceFile);
      
      expect(jsxStyleProps.length).toBe(3);
      expect(jsxStyleProps.map(p => p.propName)).toEqual(['gap', 'fill', 'padding']);
    });

    it('should detect style props on self-closing JSX elements', () => {
      const code = `
        const Component = () => <Button fill="#success" radius="1r" />;
      `;
      const sourceFile = createSourceFile(code);
      const jsxStyleProps = detectAllJsxStyleProps(sourceFile);
      
      expect(jsxStyleProps.length).toBe(2);
      expect(jsxStyleProps[0].propName).toBe('fill');
      expect(jsxStyleProps[0].value).toBe('#success');
      expect(jsxStyleProps[1].propName).toBe('radius');
      expect(jsxStyleProps[1].value).toBe('1r');
    });

    it('should not detect non-style props', () => {
      const code = `
        const Component = () => (
          <Button onClick={handleClick} disabled aria-label="Submit" gap="2x">
            Submit
          </Button>
        );
      `;
      const sourceFile = createSourceFile(code);
      const jsxStyleProps = detectAllJsxStyleProps(sourceFile);
      
      // Only gap should be detected, not onClick, disabled, or aria-label
      expect(jsxStyleProps.length).toBe(1);
      expect(jsxStyleProps[0].propName).toBe('gap');
    });

    it('should capture component name correctly', () => {
      const code = `
        const Component = () => (
          <Card.Header gap="1x" />
        );
      `;
      const sourceFile = createSourceFile(code);
      const jsxStyleProps = detectAllJsxStyleProps(sourceFile);
      
      expect(jsxStyleProps.length).toBe(1);
      expect(jsxStyleProps[0].componentName).toBe('Card.Header');
      expect(jsxStyleProps[0].propName).toBe('gap');
    });

    it('should handle expression values', () => {
      const code = `
        const Component = () => (
          <Flex gap={someVar} fill={{ '': '#red', hovered: '#blue' }}>
            Content
          </Flex>
        );
      `;
      const sourceFile = createSourceFile(code);
      const jsxStyleProps = detectAllJsxStyleProps(sourceFile);
      
      expect(jsxStyleProps.length).toBe(2);
      expect(jsxStyleProps[0].propName).toBe('gap');
      expect(jsxStyleProps[0].isStringValue).toBe(false);
      expect(jsxStyleProps[1].propName).toBe('fill');
      expect(jsxStyleProps[1].isObjectValue).toBe(true);
    });

    it('should detect multiple JSX elements in the same file', () => {
      const code = `
        const Component = () => (
          <Flex gap="2x">
            <Card padding="3x" fill="#white">
              <Text color="#dark">Hello</Text>
            </Card>
          </Flex>
        );
      `;
      const sourceFile = createSourceFile(code);
      const jsxStyleProps = detectAllJsxStyleProps(sourceFile);
      
      expect(jsxStyleProps.length).toBe(4);
      expect(jsxStyleProps.map(p => p.propName)).toEqual(['gap', 'padding', 'fill', 'color']);
    });
  });

  describe('isStyleProperty', () => {
    it('should return true for valid style properties', () => {
      expect(isStyleProperty('gap')).toBe(true);
      expect(isStyleProperty('fill')).toBe(true);
      expect(isStyleProperty('padding')).toBe(true);
      expect(isStyleProperty('display')).toBe(true);
      expect(isStyleProperty('color')).toBe(true);
    });

    it('should return false for non-style properties', () => {
      expect(isStyleProperty('onClick')).toBe(false);
      expect(isStyleProperty('disabled')).toBe(false);
      expect(isStyleProperty('aria-label')).toBe(false);
      expect(isStyleProperty('className')).toBe(false);
    });
  });
});
