/**
 * Tasty Value Parser
 *
 * Tokenizes tasty style values for syntax highlighting.
 * Handles color tokens, custom properties, units, functions, etc.
 */

import { TastyToken, TastyTokenType } from '../../shared/src/types';
import {
  BUILT_IN_UNITS,
  CSS_UNITS,
  CSS_FUNCTIONS,
  PRESET_MODIFIERS,
  DIRECTION_MODIFIERS,
} from './builtins';
import {
  isDigit,
  isIdentifierStart,
  isIdentifierChar,
  isIdentifierCharWithDash,
} from './parserUtils';

/**
 * Parser for tasty style values.
 */
export class TastyValueParser {
  private input: string;
  private pos: number;
  private tokens: TastyToken[];

  // Config-based validation
  private validTokens: Set<string> | null;
  private validUnits: Set<string>;
  private validPresets: Set<string> | null;

  constructor(
    input: string,
    options?: {
      tokens?: string[] | false;
      units?: string[];
      presets?: string[];
    },
  ) {
    this.input = input;
    this.pos = 0;
    this.tokens = [];

    // Build sets for fast lookup
    this.validTokens = options?.tokens === false ? null : new Set(options?.tokens ?? []);
    this.validUnits = new Set([...BUILT_IN_UNITS, ...(options?.units ?? [])]);
    this.validPresets = options?.presets ? new Set(options.presets) : null;
  }

  /**
   * Parse the input and return tokens.
   */
  parse(): TastyToken[] {
    while (this.pos < this.input.length) {
      const token = this.parseNextToken();
      if (token) {
        this.tokens.push(token);
      }
    }
    return this.tokens;
  }

  private parseNextToken(): TastyToken | null {
    this.skipWhitespace();

    if (this.pos >= this.input.length) {
      return null;
    }

    const char = this.input[this.pos];

    // Color token or hex color: #...
    if (char === '#') {
      return this.parseHashToken();
    }

    // Custom property: $...
    if (char === '$') {
      return this.parseCustomProperty();
    }

    // String literal
    if (char === '"' || char === "'") {
      return this.parseString();
    }

    // Number or unit
    if (isDigit(char) || (char === '.' && isDigit(this.peek(1)))) {
      return this.parseNumber();
    }

    // Negative number
    if (char === '-' && (isDigit(this.peek(1)) || this.peek(1) === '.')) {
      return this.parseNumber();
    }

    // Operators
    if (['+', '-', '*', '/'].includes(char) && !isDigit(this.peek(1))) {
      return this.parseOperator();
    }

    // Punctuation
    if (['(', ')', '{', '}', '[', ']', ':', ',', ';'].includes(char)) {
      return this.parsePunctuation();
    }

    // Identifier (function, preset, boolean, direction, etc.)
    if (isIdentifierStart(char)) {
      return this.parseIdentifier();
    }

    // Unknown character - skip it
    const start = this.pos;
    this.pos++;
    return {
      type: TastyTokenType.Unknown,
      value: char,
      start,
      end: this.pos,
    };
  }

  /**
   * Parse # tokens: color tokens (#primary) or hex colors (#fff)
   */
  private parseHashToken(): TastyToken {
    const start = this.pos;
    this.pos++; // skip #

    // Check for ## (color token name reference)
    if (this.input[this.pos] === '#') {
      this.pos++; // skip second #
      const name = this.readIdentifierWithDashes();
      return {
        type: TastyTokenType.ColorTokenName,
        value: '##' + name,
        start,
        end: this.pos,
      };
    }

    // Try to match a valid hex color first (3, 4, 6, or 8 hex digits not followed by identifier chars)
    // This correctly handles cases like #abc, #aabbcc which could be confused with color tokens
    const remaining = this.input.slice(this.pos);
    const hexMatch = remaining.match(
      /^([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})(?![a-zA-Z0-9-])/,
    );

    if (hexMatch) {
      this.pos += hexMatch[1].length;
      return {
        type: TastyTokenType.HexColor,
        value: '#' + hexMatch[1],
        start,
        end: this.pos,
      };
    }

    // Otherwise it's a color token (identifier with optional opacity suffix)
    const name = this.readColorTokenName();
    return {
      type: TastyTokenType.ColorToken,
      value: '#' + name,
      start,
      end: this.pos,
    };
  }

  /**
   * Read a color token name which may include .opacity suffix
   * e.g., primary, purple.5, dark-bg.50
   */
  private readColorTokenName(): string {
    let name = this.readIdentifierWithDashes();

    // Check for opacity suffix: .5, .50, .$opacity
    if (this.input[this.pos] === '.') {
      this.pos++; // skip .
      name += '.';

      if (this.input[this.pos] === '$') {
        // Dynamic opacity: .$variable
        this.pos++;
        name += '$' + this.readIdentifierWithDashes();
      } else {
        // Numeric opacity: .5, .50
        name += this.readDigits();
      }
    }

    return name;
  }

  /**
   * Parse $ tokens: custom properties or property name references
   */
  private parseCustomProperty(): TastyToken {
    const start = this.pos;
    this.pos++; // skip $

    // Check for $$ (property name reference)
    if (this.input[this.pos] === '$') {
      this.pos++; // skip second $
      const name = this.readIdentifierWithDashes();
      return {
        type: TastyTokenType.CustomPropertyName,
        value: '$$' + name,
        start,
        end: this.pos,
      };
    }

    const name = this.readIdentifierWithDashes();
    return {
      type: TastyTokenType.CustomProperty,
      value: '$' + name,
      start,
      end: this.pos,
    };
  }

  /**
   * Parse string literals
   */
  private parseString(): TastyToken {
    const start = this.pos;
    const quote = this.input[this.pos];
    this.pos++; // skip opening quote

    let value = quote;
    while (this.pos < this.input.length) {
      const char = this.input[this.pos];
      if (char === quote) {
        value += char;
        this.pos++;
        break;
      }
      if (char === '\\' && this.pos + 1 < this.input.length) {
        value += char + this.input[this.pos + 1];
        this.pos += 2;
      } else {
        value += char;
        this.pos++;
      }
    }

    return {
      type: TastyTokenType.String,
      value,
      start,
      end: this.pos,
    };
  }

  /**
   * Parse numbers with optional units
   */
  private parseNumber(): TastyToken {
    const start = this.pos;

    // Handle negative sign
    let numStr = '';
    if (this.input[this.pos] === '-') {
      numStr += '-';
      this.pos++;
    }

    // Read integer part
    numStr += this.readDigits();

    // Read decimal part
    if (this.input[this.pos] === '.' && isDigit(this.peek(1))) {
      numStr += '.';
      this.pos++;
      numStr += this.readDigits();
    }

    // Check for unit
    const unitStart = this.pos;
    const unit = this.readIdentifier();

    if (unit) {
      const fullValue = numStr + unit;

      // Check if it's a custom unit (x, r, bw, etc.)
      if (this.validUnits.has(unit)) {
        return {
          type: TastyTokenType.CustomUnit,
          value: fullValue,
          start,
          end: this.pos,
        };
      }

      // Check if it's a CSS unit
      if (CSS_UNITS.includes(unit)) {
        return {
          type: TastyTokenType.CssUnit,
          value: fullValue,
          start,
          end: this.pos,
        };
      }

      // Unknown unit - treat as custom unit anyway
      return {
        type: TastyTokenType.CustomUnit,
        value: fullValue,
        start,
        end: this.pos,
      };
    }

    return {
      type: TastyTokenType.Number,
      value: numStr,
      start,
      end: this.pos,
    };
  }

  /**
   * Parse operators
   */
  private parseOperator(): TastyToken {
    const start = this.pos;
    const value = this.input[this.pos];
    this.pos++;

    return {
      type: TastyTokenType.Operator,
      value,
      start,
      end: this.pos,
    };
  }

  /**
   * Parse punctuation
   */
  private parsePunctuation(): TastyToken {
    const start = this.pos;
    const value = this.input[this.pos];
    this.pos++;

    return {
      type: TastyTokenType.Punctuation,
      value,
      start,
      end: this.pos,
    };
  }

  /**
   * Parse identifiers (functions, presets, booleans, directions)
   */
  private parseIdentifier(): TastyToken {
    const start = this.pos;
    const name = this.readIdentifierWithDashes();

    // Check for function call
    if (this.input[this.pos] === '(') {
      const funcToken: TastyToken = {
        type: TastyTokenType.Function,
        value: name,
        start,
        end: this.pos,
        children: [],
      };

      // Parse function arguments
      this.pos++; // skip (
      let depth = 1;
      const argsStart = this.pos;

      while (this.pos < this.input.length && depth > 0) {
        if (this.input[this.pos] === '(') depth++;
        if (this.input[this.pos] === ')') depth--;
        this.pos++;
      }

      // Parse the function arguments as sub-tokens
      const argsStr = this.input.slice(argsStart, this.pos - 1);
      const argsParser = new TastyValueParser(argsStr, {
        tokens: this.validTokens ? [...this.validTokens] : false,
        units: [...this.validUnits],
        presets: this.validPresets ? [...this.validPresets] : undefined,
      });
      funcToken.children = argsParser.parse().map((t) => ({
        ...t,
        start: t.start + argsStart,
        end: t.end + argsStart,
      }));

      funcToken.end = this.pos;
      return funcToken;
    }

    // Check for boolean
    if (name === 'true' || name === 'false') {
      return {
        type: TastyTokenType.Boolean,
        value: name,
        start,
        end: this.pos,
      };
    }

    // Check for preset modifier
    if (PRESET_MODIFIERS.includes(name)) {
      return {
        type: TastyTokenType.PresetModifier,
        value: name,
        start,
        end: this.pos,
      };
    }

    // Check for direction
    if (DIRECTION_MODIFIERS.includes(name)) {
      return {
        type: TastyTokenType.Direction,
        value: name,
        start,
        end: this.pos,
      };
    }

    // Check for preset (from config)
    if (this.validPresets?.has(name)) {
      return {
        type: TastyTokenType.Preset,
        value: name,
        start,
        end: this.pos,
      };
    }

    // Check for CSS function
    if (CSS_FUNCTIONS.includes(name)) {
      return {
        type: TastyTokenType.Function,
        value: name,
        start,
        end: this.pos,
      };
    }

    // Generic identifier
    return {
      type: TastyTokenType.Identifier,
      value: name,
      start,
      end: this.pos,
    };
  }

  // Helper methods

  private skipWhitespace(): void {
    while (this.pos < this.input.length && /\s/.test(this.input[this.pos])) {
      this.pos++;
    }
  }

  private peek(offset: number = 0): string {
    return this.input[this.pos + offset] ?? '';
  }

  private readDigits(): string {
    let result = '';
    while (this.pos < this.input.length && isDigit(this.input[this.pos])) {
      result += this.input[this.pos];
      this.pos++;
    }
    return result;
  }

  private readIdentifier(): string {
    let result = '';
    while (this.pos < this.input.length && isIdentifierChar(this.input[this.pos])) {
      result += this.input[this.pos];
      this.pos++;
    }
    return result;
  }

  private readIdentifierWithDashes(): string {
    let result = '';
    while (this.pos < this.input.length && isIdentifierCharWithDash(this.input[this.pos])) {
      result += this.input[this.pos];
      this.pos++;
    }
    return result;
  }
}

/**
 * Parse a tasty style value string.
 */
export function parseValue(
  input: string,
  options?: {
    tokens?: string[] | false;
    units?: string[];
    presets?: string[];
  },
): TastyToken[] {
  const parser = new TastyValueParser(input, options);
  return parser.parse();
}
