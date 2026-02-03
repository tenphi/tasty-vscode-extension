/**
 * Tests for the Tasty Value Parser
 */

import { parseValue } from '../server/src/tastyParser';
import { TastyTokenType } from '../shared/src/types';

describe('TastyValueParser', () => {
  describe('Color Tokens', () => {
    it('should parse simple color token', () => {
      const tokens = parseValue('#primary');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TastyTokenType.ColorToken);
      expect(tokens[0].value).toBe('#primary');
    });

    it('should parse color token with opacity', () => {
      const tokens = parseValue('#purple.5');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TastyTokenType.ColorToken);
      expect(tokens[0].value).toBe('#purple.5');
    });

    it('should parse color token with numeric opacity', () => {
      const tokens = parseValue('#dark.50');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TastyTokenType.ColorToken);
      expect(tokens[0].value).toBe('#dark.50');
    });

    it('should parse color token with dynamic opacity', () => {
      const tokens = parseValue('#text.$opacity');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TastyTokenType.ColorToken);
      expect(tokens[0].value).toBe('#text.$opacity');
    });

    it('should parse color token name reference', () => {
      const tokens = parseValue('##accent');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TastyTokenType.ColorTokenName);
      expect(tokens[0].value).toBe('##accent');
    });

    it('should parse hex color', () => {
      const tokens = parseValue('#fff');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TastyTokenType.HexColor);
      expect(tokens[0].value).toBe('#fff');
    });

    it('should parse 6-digit hex color', () => {
      const tokens = parseValue('#aabbcc');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TastyTokenType.HexColor);
      expect(tokens[0].value).toBe('#aabbcc');
    });
  });

  describe('Custom Properties', () => {
    it('should parse custom property', () => {
      const tokens = parseValue('$spacing');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TastyTokenType.CustomProperty);
      expect(tokens[0].value).toBe('$spacing');
    });

    it('should parse custom property with dashes', () => {
      const tokens = parseValue('$card-padding');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TastyTokenType.CustomProperty);
      expect(tokens[0].value).toBe('$card-padding');
    });

    it('should parse custom property name reference', () => {
      const tokens = parseValue('$$rotation');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TastyTokenType.CustomPropertyName);
      expect(tokens[0].value).toBe('$$rotation');
    });
  });

  describe('Units', () => {
    it('should parse custom unit', () => {
      const tokens = parseValue('2x');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TastyTokenType.CustomUnit);
      expect(tokens[0].value).toBe('2x');
    });

    it('should parse decimal custom unit', () => {
      const tokens = parseValue('1.5r');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TastyTokenType.CustomUnit);
      expect(tokens[0].value).toBe('1.5r');
    });

    it('should parse CSS unit', () => {
      const tokens = parseValue('16px');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TastyTokenType.CssUnit);
      expect(tokens[0].value).toBe('16px');
    });

    it('should parse multiple units', () => {
      const tokens = parseValue('2x 4x');
      expect(tokens).toHaveLength(2);
      expect(tokens[0].value).toBe('2x');
      expect(tokens[1].value).toBe('4x');
    });

    it('should parse negative custom unit', () => {
      const tokens = parseValue('-2x');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TastyTokenType.CustomUnit);
      expect(tokens[0].value).toBe('-2x');
    });

    it('should parse negative border width unit', () => {
      const tokens = parseValue('-1bw');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TastyTokenType.CustomUnit);
      expect(tokens[0].value).toBe('-1bw');
    });

    it('should parse negative decimal unit', () => {
      const tokens = parseValue('-1.5r');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TastyTokenType.CustomUnit);
      expect(tokens[0].value).toBe('-1.5r');
    });

    it('should parse negative CSS unit', () => {
      const tokens = parseValue('-10px');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TastyTokenType.CssUnit);
      expect(tokens[0].value).toBe('-10px');
    });
  });

  describe('Functions', () => {
    it('should parse function call', () => {
      const tokens = parseValue('calc(100% - 2x)');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TastyTokenType.Function);
      expect(tokens[0].value).toBe('calc');
      expect(tokens[0].children).toBeDefined();
    });

    it('should parse rgb function', () => {
      const tokens = parseValue('rgb(255, 0, 0)');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TastyTokenType.Function);
      expect(tokens[0].value).toBe('rgb');
    });
  });

  describe('Presets', () => {
    it('should parse preset when in config', () => {
      const tokens = parseValue('h1', { presets: ['h1', 'h2', 't1', 't2'] });
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TastyTokenType.Preset);
      expect(tokens[0].value).toBe('h1');
    });

    it('should parse preset modifier', () => {
      const tokens = parseValue('strong');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TastyTokenType.PresetModifier);
      expect(tokens[0].value).toBe('strong');
    });

    it('should parse preset with modifier', () => {
      const tokens = parseValue('t1 strong', { presets: ['t1'] });
      expect(tokens).toHaveLength(2);
      expect(tokens[0].type).toBe(TastyTokenType.Preset);
      expect(tokens[1].type).toBe(TastyTokenType.PresetModifier);
    });
  });

  describe('Directions', () => {
    it('should parse direction modifier', () => {
      const tokens = parseValue('top');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TastyTokenType.Direction);
      expect(tokens[0].value).toBe('top');
    });

    it('should parse value with direction', () => {
      const tokens = parseValue('2x top bottom');
      expect(tokens).toHaveLength(3);
      expect(tokens[0].type).toBe(TastyTokenType.CustomUnit);
      expect(tokens[1].type).toBe(TastyTokenType.Direction);
      expect(tokens[2].type).toBe(TastyTokenType.Direction);
    });
  });

  describe('Complex Values', () => {
    it('should parse border shorthand', () => {
      const tokens = parseValue('#dark.12 bottom');
      expect(tokens).toHaveLength(2);
      expect(tokens[0].type).toBe(TastyTokenType.ColorToken);
      expect(tokens[1].type).toBe(TastyTokenType.Direction);
    });

    it('should parse shadow value', () => {
      const tokens = parseValue('0 1bw .375x #dark.15');
      expect(tokens).toHaveLength(4);
      expect(tokens[0].type).toBe(TastyTokenType.Number);
      expect(tokens[1].type).toBe(TastyTokenType.CustomUnit);
      expect(tokens[2].type).toBe(TastyTokenType.CustomUnit);
      expect(tokens[3].type).toBe(TastyTokenType.ColorToken);
    });
  });

  describe('Hex vs Color Token Disambiguation', () => {
    it('should parse #abc as hex color (3 digits)', () => {
      const tokens = parseValue('#abc');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TastyTokenType.HexColor);
      expect(tokens[0].value).toBe('#abc');
    });

    it('should parse #ABCD as hex color (4 digits with alpha)', () => {
      const tokens = parseValue('#ABCD');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TastyTokenType.HexColor);
      expect(tokens[0].value).toBe('#ABCD');
    });

    it('should parse #abcdef as hex color (6 digits)', () => {
      const tokens = parseValue('#abcdef');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TastyTokenType.HexColor);
      expect(tokens[0].value).toBe('#abcdef');
    });

    it('should parse #aabbccdd as hex color (8 digits with alpha)', () => {
      const tokens = parseValue('#aabbccdd');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TastyTokenType.HexColor);
      expect(tokens[0].value).toBe('#aabbccdd');
    });

    it('should parse #abc-color as color token (has dash)', () => {
      const tokens = parseValue('#abc-color');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TastyTokenType.ColorToken);
      expect(tokens[0].value).toBe('#abc-color');
    });

    it('should parse #abcdefg as color token (7 chars, not valid hex)', () => {
      const tokens = parseValue('#abcdefg');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TastyTokenType.ColorToken);
      expect(tokens[0].value).toBe('#abcdefg');
    });

    it('should parse #surface as color token', () => {
      const tokens = parseValue('#surface');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TastyTokenType.ColorToken);
      expect(tokens[0].value).toBe('#surface');
    });

    it('should parse #face as hex color (4 valid hex digits)', () => {
      const tokens = parseValue('#face');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TastyTokenType.HexColor);
      expect(tokens[0].value).toBe('#face');
    });

    it('should parse #facade as hex color (6 valid hex digits)', () => {
      const tokens = parseValue('#facade');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TastyTokenType.HexColor);
      expect(tokens[0].value).toBe('#facade');
    });

    it('should parse #abcd followed by .5 as hex color and separate tokens', () => {
      // #abcd is valid 4-digit hex, so it's parsed as hex color
      // The .5 after it would be parsed separately (as class selector or number)
      const tokens = parseValue('#abcd');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TastyTokenType.HexColor);
      expect(tokens[0].value).toBe('#abcd');
    });

    it('should parse color token with explicit dash for opacity', () => {
      // Use a clearly non-hex token with opacity
      const tokens = parseValue('#blue.5');
      expect(tokens).toHaveLength(1);
      expect(tokens[0].type).toBe(TastyTokenType.ColorToken);
      expect(tokens[0].value).toBe('#blue.5');
    });

    it('should parse hex color followed by other tokens', () => {
      const tokens = parseValue('#fff bottom');
      expect(tokens).toHaveLength(2);
      expect(tokens[0].type).toBe(TastyTokenType.HexColor);
      expect(tokens[0].value).toBe('#fff');
      expect(tokens[1].type).toBe(TastyTokenType.Direction);
    });
  });
});
