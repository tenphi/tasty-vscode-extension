/**
 * Tests for the Parser Utilities module
 */

import {
  isDigit,
  isIdentifierStart,
  isIdentifierChar,
  isIdentifierCharWithDash,
  skipWhitespace,
  peek,
  readDigits,
  readIdentifier,
  readIdentifierWithDashes,
  readParenthesized,
  ParserContext,
} from '../server/src/parserUtils';

describe('ParserUtils', () => {
  describe('isDigit', () => {
    it('should return true for digits', () => {
      expect(isDigit('0')).toBe(true);
      expect(isDigit('5')).toBe(true);
      expect(isDigit('9')).toBe(true);
    });

    it('should return false for non-digits', () => {
      expect(isDigit('a')).toBe(false);
      expect(isDigit('$')).toBe(false);
      expect(isDigit(' ')).toBe(false);
    });
  });

  describe('isIdentifierStart', () => {
    it('should return true for letters and underscore', () => {
      expect(isIdentifierStart('a')).toBe(true);
      expect(isIdentifierStart('Z')).toBe(true);
      expect(isIdentifierStart('_')).toBe(true);
    });

    it('should return false for digits and symbols', () => {
      expect(isIdentifierStart('0')).toBe(false);
      expect(isIdentifierStart('$')).toBe(false);
      expect(isIdentifierStart('-')).toBe(false);
    });
  });

  describe('isIdentifierChar', () => {
    it('should return true for alphanumeric and underscore', () => {
      expect(isIdentifierChar('a')).toBe(true);
      expect(isIdentifierChar('Z')).toBe(true);
      expect(isIdentifierChar('5')).toBe(true);
      expect(isIdentifierChar('_')).toBe(true);
    });

    it('should return false for dash and symbols', () => {
      expect(isIdentifierChar('-')).toBe(false);
      expect(isIdentifierChar('$')).toBe(false);
    });
  });

  describe('isIdentifierCharWithDash', () => {
    it('should return true for alphanumeric, underscore, and dash', () => {
      expect(isIdentifierCharWithDash('a')).toBe(true);
      expect(isIdentifierCharWithDash('Z')).toBe(true);
      expect(isIdentifierCharWithDash('5')).toBe(true);
      expect(isIdentifierCharWithDash('_')).toBe(true);
      expect(isIdentifierCharWithDash('-')).toBe(true);
    });

    it('should return false for other symbols', () => {
      expect(isIdentifierCharWithDash('$')).toBe(false);
      expect(isIdentifierCharWithDash('#')).toBe(false);
    });
  });

  describe('skipWhitespace', () => {
    it('should skip whitespace characters', () => {
      const ctx: ParserContext = { input: '   abc', pos: 0 };
      skipWhitespace(ctx);
      expect(ctx.pos).toBe(3);
    });

    it('should not skip non-whitespace', () => {
      const ctx: ParserContext = { input: 'abc', pos: 0 };
      skipWhitespace(ctx);
      expect(ctx.pos).toBe(0);
    });
  });

  describe('peek', () => {
    it('should return character at offset', () => {
      const ctx: ParserContext = { input: 'hello', pos: 0 };
      expect(peek(ctx, 0)).toBe('h');
      expect(peek(ctx, 1)).toBe('e');
      expect(peek(ctx, 4)).toBe('o');
    });

    it('should return empty string for out of bounds', () => {
      const ctx: ParserContext = { input: 'hi', pos: 0 };
      expect(peek(ctx, 10)).toBe('');
    });
  });

  describe('readDigits', () => {
    it('should read consecutive digits', () => {
      const ctx: ParserContext = { input: '123abc', pos: 0 };
      expect(readDigits(ctx)).toBe('123');
      expect(ctx.pos).toBe(3);
    });

    it('should return empty for non-digits', () => {
      const ctx: ParserContext = { input: 'abc', pos: 0 };
      expect(readDigits(ctx)).toBe('');
      expect(ctx.pos).toBe(0);
    });
  });

  describe('readIdentifier', () => {
    it('should read alphanumeric identifier', () => {
      const ctx: ParserContext = { input: 'hello123-world', pos: 0 };
      expect(readIdentifier(ctx)).toBe('hello123');
      expect(ctx.pos).toBe(8);
    });
  });

  describe('readIdentifierWithDashes', () => {
    it('should read identifier with dashes', () => {
      const ctx: ParserContext = { input: 'hello-world#end', pos: 0 };
      expect(readIdentifierWithDashes(ctx)).toBe('hello-world');
      expect(ctx.pos).toBe(11);
    });
  });

  describe('readParenthesized', () => {
    it('should read simple parenthesized content', () => {
      const ctx: ParserContext = { input: '(hello)', pos: 0 };
      expect(readParenthesized(ctx)).toBe('(hello)');
      expect(ctx.pos).toBe(7);
    });

    it('should handle nested parentheses', () => {
      const ctx: ParserContext = { input: '(a(b)c)', pos: 0 };
      expect(readParenthesized(ctx)).toBe('(a(b)c)');
      expect(ctx.pos).toBe(7);
    });

    it('should return empty if not starting with (', () => {
      const ctx: ParserContext = { input: 'abc', pos: 0 };
      expect(readParenthesized(ctx)).toBe('');
      expect(ctx.pos).toBe(0);
    });
  });
});
