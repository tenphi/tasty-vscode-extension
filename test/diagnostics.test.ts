/**
 * Tests for the Diagnostics Provider
 */

import { RESERVED_COLOR_TOKENS, PRESET_MODIFIERS, CSS_GLOBAL_VALUES, CSS_FUNCTIONS } from '../server/src/builtins';
import { DiagnosticCode } from '../server/src/diagnostics';

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
});
