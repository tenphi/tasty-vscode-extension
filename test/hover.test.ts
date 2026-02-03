/**
 * Tests for the Hover Provider
 */

import { getHoverInfo, HoverContext } from '../server/src/hover';
import { createEmptyConfig, MergedConfig } from '../shared/src/configTypes';
import { createEmptyLocalDefinitions, LocalDefinitions } from '../server/src/localDefinitions';

describe('HoverProvider', () => {
  let config: MergedConfig;
  let localDefs: LocalDefinitions;

  beforeEach(() => {
    config = {
      ...createEmptyConfig(),
      tokens: ['#primary', '#secondary', '$gap', '$spacing'],
      presets: ['h1', 'h2', 't1', 't2'],
      states: ['@mobile', '@dark'],
      tokenDescriptions: {
        '#primary': 'Primary brand color',
        '$gap': 'Base spacing unit',
      },
      presetDescriptions: {
        'h1': 'Main heading (32px, bold)',
      },
      stateDescriptions: {
        '@mobile': 'Mobile viewport (width < 768px)',
      },
    };
    localDefs = createEmptyLocalDefinitions();
  });

  describe('Color Tokens', () => {
    it('should provide hover for color token', () => {
      const context: HoverContext = {
        word: '#primary',
        line: "fill: '#primary',",
        isPropertyName: false,
        isPropertyValue: true,
      };

      const result = getHoverInfo(context, config, localDefs);
      expect(result).not.toBeNull();
      expect(result!.contents).toHaveProperty('value');
      expect((result!.contents as { value: string }).value).toContain('Color Token');
      expect((result!.contents as { value: string }).value).toContain('Primary brand color');
    });

    it('should provide hover for ## color token name reference', () => {
      const context: HoverContext = {
        word: '##accent',
        line: "transition: '##accent',",
        isPropertyName: false,
        isPropertyValue: true,
      };

      const result = getHoverInfo(context, config, localDefs);
      expect(result).not.toBeNull();
      expect((result!.contents as { value: string }).value).toContain('Color Property Name Reference');
      expect((result!.contents as { value: string }).value).toContain('--accent-color');
    });
  });

  describe('Custom Properties', () => {
    it('should provide hover for $$ property name reference', () => {
      const context: HoverContext = {
        word: '$$rotation',
        line: "willChange: '$$rotation',",
        isPropertyName: false,
        isPropertyValue: true,
      };

      const result = getHoverInfo(context, config, localDefs);
      expect(result).not.toBeNull();
      expect((result!.contents as { value: string }).value).toContain('Property Name Reference');
      expect((result!.contents as { value: string }).value).toContain('--rotation');
    });
  });

  describe('Units', () => {
    it('should provide hover for built-in unit', () => {
      const context: HoverContext = {
        word: '2x',
        line: "padding: '2x',",
        isPropertyName: false,
        isPropertyValue: true,
      };

      const result = getHoverInfo(context, config, localDefs);
      expect(result).not.toBeNull();
      expect((result!.contents as { value: string }).value).toContain('Tasty Unit');
      expect((result!.contents as { value: string }).value).toContain('gap');
    });
  });

  describe('Presets', () => {
    it('should provide hover for preset', () => {
      const context: HoverContext = {
        word: 'h1',
        line: "preset: 'h1',",
        isPropertyName: false,
        isPropertyValue: true,
      };

      const result = getHoverInfo(context, config, localDefs);
      expect(result).not.toBeNull();
      expect((result!.contents as { value: string }).value).toContain('Typography Preset');
      expect((result!.contents as { value: string }).value).toContain('Main heading');
    });

    it('should provide hover for preset modifier', () => {
      const context: HoverContext = {
        word: 'strong',
        line: "preset: 'h1 strong',",
        isPropertyName: false,
        isPropertyValue: true,
      };

      const result = getHoverInfo(context, config, localDefs);
      expect(result).not.toBeNull();
      expect((result!.contents as { value: string }).value).toContain('Preset Modifier');
      expect((result!.contents as { value: string }).value).toContain('bold');
    });
  });

  describe('State Aliases', () => {
    it('should provide hover for state alias', () => {
      const context: HoverContext = {
        word: '@mobile',
        line: "'@mobile': '#red',",
        isPropertyName: false,
        isPropertyValue: false,
      };

      const result = getHoverInfo(context, config, localDefs);
      expect(result).not.toBeNull();
      expect((result!.contents as { value: string }).value).toContain('State Alias');
      expect((result!.contents as { value: string }).value).toContain('Mobile viewport');
    });
  });

  describe('Reserved Tokens', () => {
    it('should provide hover for #current token', () => {
      const context: HoverContext = {
        word: '#current',
        line: "fill: '#current',",
        isPropertyName: false,
        isPropertyValue: true,
      };

      const result = getHoverInfo(context, config, localDefs);
      expect(result).not.toBeNull();
      expect((result!.contents as { value: string }).value).toContain('#current');
      expect((result!.contents as { value: string }).value).toContain('currentcolor');
    });

    it('should provide hover for #current with opacity', () => {
      const context: HoverContext = {
        word: '#current.5',
        line: "fill: '#current.5',",
        isPropertyName: false,
        isPropertyValue: true,
      };

      const result = getHoverInfo(context, config, localDefs);
      expect(result).not.toBeNull();
      expect((result!.contents as { value: string }).value).toContain('#current');
      expect((result!.contents as { value: string }).value).toContain('50%');
    });
  });

  describe(':has() Selector', () => {
    it('should provide hover for :has()', () => {
      const context: HoverContext = {
        word: ':has(Body)',
        line: "':has(Body)': '#red',",
        isPropertyName: false,
        isPropertyValue: false,
      };

      const result = getHoverInfo(context, config, localDefs);
      expect(result).not.toBeNull();
      expect((result!.contents as { value: string }).value).toContain(':has() Selector');
      expect((result!.contents as { value: string }).value).toContain('data-element');
    });
  });
});
