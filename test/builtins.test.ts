/**
 * Tests for the Builtins module
 */

import {
  STYLE_PROPERTIES,
  ALL_STYLE_PROPERTIES,
  BUILT_IN_UNITS,
  CSS_UNITS,
  PRESET_MODIFIERS,
  DIRECTION_MODIFIERS,
  CSS_FUNCTIONS,
  PSEUDO_CLASSES,
  PSEUDO_ELEMENTS,
  CSS_GLOBAL_VALUES,
  RESERVED_COLOR_TOKENS,
  getUnitDescription,
} from '../server/src/builtins';

describe('Builtins', () => {
  describe('STYLE_PROPERTIES', () => {
    it('should have layout properties', () => {
      expect(STYLE_PROPERTIES.layout).toContain('display');
      expect(STYLE_PROPERTIES.layout).toContain('flow');
      expect(STYLE_PROPERTIES.layout).toContain('gap');
      expect(STYLE_PROPERTIES.layout).toContain('padding');
      expect(STYLE_PROPERTIES.layout).toContain('margin');
    });

    it('should have visual properties', () => {
      expect(STYLE_PROPERTIES.visual).toContain('fill');
      expect(STYLE_PROPERTIES.visual).toContain('color');
      expect(STYLE_PROPERTIES.visual).toContain('border');
      expect(STYLE_PROPERTIES.visual).toContain('radius');
    });

    it('should have typography properties', () => {
      expect(STYLE_PROPERTIES.typography).toContain('preset');
      expect(STYLE_PROPERTIES.typography).toContain('font');
      expect(STYLE_PROPERTIES.typography).toContain('textAlign');
    });

    it('should have special properties', () => {
      expect(STYLE_PROPERTIES.special).toContain('@keyframes');
      expect(STYLE_PROPERTIES.special).toContain('@properties');
      expect(STYLE_PROPERTIES.special).toContain('$');
    });
  });

  describe('ALL_STYLE_PROPERTIES', () => {
    it('should be a flat array of all properties', () => {
      expect(ALL_STYLE_PROPERTIES).toContain('display');
      expect(ALL_STYLE_PROPERTIES).toContain('fill');
      expect(ALL_STYLE_PROPERTIES).toContain('preset');
      expect(ALL_STYLE_PROPERTIES).toContain('@keyframes');
    });
  });

  describe('BUILT_IN_UNITS', () => {
    it('should include all built-in units', () => {
      expect(BUILT_IN_UNITS).toContain('x');
      expect(BUILT_IN_UNITS).toContain('r');
      expect(BUILT_IN_UNITS).toContain('cr');
      expect(BUILT_IN_UNITS).toContain('bw');
      expect(BUILT_IN_UNITS).toContain('ow');
      expect(BUILT_IN_UNITS).toContain('fs');
      expect(BUILT_IN_UNITS).toContain('lh');
      expect(BUILT_IN_UNITS).toContain('sf');
    });
  });

  describe('CSS_UNITS', () => {
    it('should include common CSS units', () => {
      expect(CSS_UNITS).toContain('px');
      expect(CSS_UNITS).toContain('em');
      expect(CSS_UNITS).toContain('rem');
      expect(CSS_UNITS).toContain('%');
      expect(CSS_UNITS).toContain('vw');
      expect(CSS_UNITS).toContain('vh');
    });
  });

  describe('PRESET_MODIFIERS', () => {
    it('should include all preset modifiers', () => {
      expect(PRESET_MODIFIERS).toEqual(['strong', 'italic', 'icon', 'tight']);
    });
  });

  describe('DIRECTION_MODIFIERS', () => {
    it('should include all direction modifiers', () => {
      expect(DIRECTION_MODIFIERS).toContain('top');
      expect(DIRECTION_MODIFIERS).toContain('right');
      expect(DIRECTION_MODIFIERS).toContain('bottom');
      expect(DIRECTION_MODIFIERS).toContain('left');
      expect(DIRECTION_MODIFIERS).toContain('inline');
      expect(DIRECTION_MODIFIERS).toContain('block');
    });
  });

  describe('getUnitDescription', () => {
    it('should return description for x unit', () => {
      expect(getUnitDescription('x')).toContain('gap');
    });

    it('should return description for r unit', () => {
      expect(getUnitDescription('r')).toContain('radius');
    });

    it('should return description for cr unit', () => {
      expect(getUnitDescription('cr')).toContain('card radius');
    });

    it('should return description for bw unit', () => {
      expect(getUnitDescription('bw')).toContain('border width');
    });

    it('should return description for ow unit', () => {
      expect(getUnitDescription('ow')).toContain('outline width');
    });

    it('should return description for fs unit', () => {
      expect(getUnitDescription('fs')).toContain('font size');
    });

    it('should return description for lh unit', () => {
      expect(getUnitDescription('lh')).toContain('line height');
    });

    it('should return description for sf unit', () => {
      expect(getUnitDescription('sf')).toContain('stable fraction');
    });

    it('should return "custom unit" for unknown units', () => {
      expect(getUnitDescription('unknown')).toBe('custom unit');
    });
  });

  describe('RESERVED_COLOR_TOKENS', () => {
    it('should include #current', () => {
      expect(RESERVED_COLOR_TOKENS).toContain('#current');
    });
  });

  describe('CSS_GLOBAL_VALUES', () => {
    it('should include all global values', () => {
      expect(CSS_GLOBAL_VALUES).toEqual([
        'inherit',
        'initial',
        'unset',
        'revert',
        'revert-layer',
      ]);
    });
  });

  describe('PSEUDO_CLASSES', () => {
    it('should include common pseudo-classes', () => {
      expect(PSEUDO_CLASSES).toContain('hover');
      expect(PSEUDO_CLASSES).toContain('focus');
      expect(PSEUDO_CLASSES).toContain('active');
      expect(PSEUDO_CLASSES).toContain('disabled');
      expect(PSEUDO_CLASSES).toContain('has');
    });
  });

  describe('PSEUDO_ELEMENTS', () => {
    it('should include common pseudo-elements', () => {
      expect(PSEUDO_ELEMENTS).toContain('before');
      expect(PSEUDO_ELEMENTS).toContain('after');
      expect(PSEUDO_ELEMENTS).toContain('placeholder');
    });
  });
});
