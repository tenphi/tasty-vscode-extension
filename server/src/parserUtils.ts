/**
 * Shared Parser Utilities
 *
 * Common helper functions used by both tastyParser and stateParser.
 */

/**
 * Check if a character is a digit (0-9).
 */
export function isDigit(char: string): boolean {
  return /[0-9]/.test(char);
}

/**
 * Check if a character is a valid identifier start (letter or underscore).
 */
export function isIdentifierStart(char: string): boolean {
  return /[a-zA-Z_]/.test(char);
}

/**
 * Check if a character is a valid identifier character (letter, digit, or underscore).
 */
export function isIdentifierChar(char: string): boolean {
  return /[a-zA-Z0-9_]/.test(char);
}

/**
 * Check if a character is a valid identifier character including dashes.
 */
export function isIdentifierCharWithDash(char: string): boolean {
  return /[a-zA-Z0-9_-]/.test(char);
}

/**
 * Parser context that can be used to track position in a string.
 */
export interface ParserContext {
  input: string;
  pos: number;
}

/**
 * Skip whitespace characters in the input.
 */
export function skipWhitespace(ctx: ParserContext): void {
  while (ctx.pos < ctx.input.length && /\s/.test(ctx.input[ctx.pos])) {
    ctx.pos++;
  }
}

/**
 * Peek at a character at an offset from the current position.
 */
export function peek(ctx: ParserContext, offset: number = 0): string {
  return ctx.input[ctx.pos + offset] ?? '';
}

/**
 * Read consecutive digits from the input.
 */
export function readDigits(ctx: ParserContext): string {
  let result = '';
  while (ctx.pos < ctx.input.length && isDigit(ctx.input[ctx.pos])) {
    result += ctx.input[ctx.pos];
    ctx.pos++;
  }
  return result;
}

/**
 * Read an identifier (letters, digits, underscores).
 */
export function readIdentifier(ctx: ParserContext): string {
  let result = '';
  while (ctx.pos < ctx.input.length && isIdentifierChar(ctx.input[ctx.pos])) {
    result += ctx.input[ctx.pos];
    ctx.pos++;
  }
  return result;
}

/**
 * Read an identifier with dashes (letters, digits, underscores, hyphens).
 */
export function readIdentifierWithDashes(ctx: ParserContext): string {
  let result = '';
  while (ctx.pos < ctx.input.length && isIdentifierCharWithDash(ctx.input[ctx.pos])) {
    result += ctx.input[ctx.pos];
    ctx.pos++;
  }
  return result;
}

/**
 * Read a parenthesized expression including the parens.
 */
export function readParenthesized(ctx: ParserContext): string {
  if (ctx.input[ctx.pos] !== '(') return '';

  let result = '';
  let depth = 0;

  while (ctx.pos < ctx.input.length) {
    const char = ctx.input[ctx.pos];
    result += char;

    if (char === '(') depth++;
    if (char === ')') {
      depth--;
      ctx.pos++;
      if (depth === 0) break;
    } else {
      ctx.pos++;
    }
  }

  return result;
}
