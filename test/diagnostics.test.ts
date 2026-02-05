/**
 * Tests for the Diagnostics Provider
 */

import * as ts from 'typescript';
import { RESERVED_COLOR_TOKENS, PRESET_MODIFIERS, CSS_GLOBAL_VALUES, CSS_FUNCTIONS } from '../server/src/builtins';
import { DiagnosticCode } from '../server/src/diagnostics';
import { detectContexts, detectAllJsxStyleProps } from '../server/src/contextDetector';

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

describe('Diagnostics', () => {
  describe('Reserved Color Tokens', () => {
    it('should include #current as reserved', () => {
      expect(RESERVED_COLOR_TOKENS).toContain('#current');
    });
  });

  describe('Preset Modifiers', () => {
    it('should include all built-in modifiers', () => {
      expect(PRESET_MODIFIERS).toContain('strong');
      expect(PRESET_MODIFIERS).toContain('italic');
      expect(PRESET_MODIFIERS).toContain('icon');
      expect(PRESET_MODIFIERS).toContain('tight');
    });
  });

  describe('CSS Global Values', () => {
    it('should include inherit, initial, unset, revert, revert-layer', () => {
      expect(CSS_GLOBAL_VALUES).toContain('inherit');
      expect(CSS_GLOBAL_VALUES).toContain('initial');
      expect(CSS_GLOBAL_VALUES).toContain('unset');
      expect(CSS_GLOBAL_VALUES).toContain('revert');
      expect(CSS_GLOBAL_VALUES).toContain('revert-layer');
    });
  });

  describe('CSS Functions', () => {
    it('should include common CSS functions', () => {
      expect(CSS_FUNCTIONS).toContain('calc');
      expect(CSS_FUNCTIONS).toContain('rgb');
      expect(CSS_FUNCTIONS).toContain('rgba');
      expect(CSS_FUNCTIONS).toContain('var');
      expect(CSS_FUNCTIONS).toContain('linear-gradient');
    });
  });

  describe('Diagnostic Codes', () => {
    it('should have InvalidStateKey code', () => {
      expect(DiagnosticCode.InvalidStateKey).toBeDefined();
    });

    it('should have all expected diagnostic codes', () => {
      expect(DiagnosticCode.UnknownToken).toBeDefined();
      expect(DiagnosticCode.UnknownUnit).toBeDefined();
      expect(DiagnosticCode.UnknownPreset).toBeDefined();
      expect(DiagnosticCode.UnknownStateAlias).toBeDefined();
      expect(DiagnosticCode.UnknownFunction).toBeDefined();
    });
  });

  describe('JSX Style Prop Detection for Validation', () => {
    it('should detect JSX style props with color tokens', () => {
      const code = `
        const Component = () => (
          <Flex gap="2x" fill="#unknown-token">
            Hello
          </Flex>
        );
      `;
      const sourceFile = createSourceFile(code);
      const jsxStyleProps = detectAllJsxStyleProps(sourceFile);
      
      // Should detect fill prop with the color token value
      const fillProp = jsxStyleProps.find(p => p.propName === 'fill');
      expect(fillProp).toBeDefined();
      expect(fillProp?.value).toBe('#unknown-token');
      expect(fillProp?.isStringValue).toBe(true);
    });

    it('should detect JSX style props with units', () => {
      const code = `
        const Component = () => (
          <Flex gap="2foo">
            Hello
          </Flex>
        );
      `;
      const sourceFile = createSourceFile(code);
      const jsxStyleProps = detectAllJsxStyleProps(sourceFile);
      
      // Should detect gap prop with the unit value
      const gapProp = jsxStyleProps.find(p => p.propName === 'gap');
      expect(gapProp).toBeDefined();
      expect(gapProp?.value).toBe('2foo');
      expect(gapProp?.isStringValue).toBe(true);
    });

    it('should capture property name positions for validation', () => {
      const code = `
        const Component = () => (
          <Flex gap="2x" fill="#primary">
            Hello
          </Flex>
        );
      `;
      const sourceFile = createSourceFile(code);
      const jsxStyleProps = detectAllJsxStyleProps(sourceFile);
      
      expect(jsxStyleProps.length).toBe(2);
      
      // Each prop should have proper position information
      for (const prop of jsxStyleProps) {
        expect(prop.propNameStart).toBeDefined();
        expect(prop.propNameEnd).toBeDefined();
        expect(prop.propNameEnd).toBeGreaterThan(prop.propNameStart);
        expect(prop.valueStart).toBeDefined();
        expect(prop.valueEnd).toBeDefined();
        expect(prop.valueEnd).toBeGreaterThan(prop.valueStart);
      }
    });
  });
});
