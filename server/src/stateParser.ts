/**
 * State Key Parser
 *
 * Parses tasty state keys used in style mappings.
 * Examples: 'hovered', 'theme=dark', ':hover', '@media(w < 768px)', 'hovered & !disabled'
 */

import { TastyToken, TastyTokenType } from '../../shared/src/types';
import {
  isDigit,
  isIdentifierStart,
  isIdentifierCharWithDash,
} from './parserUtils';

/**
 * Parser for tasty state keys.
 */
export class StateKeyParser {
  private input: string;
  private pos: number;
  private tokens: TastyToken[];
  private stateAliases: Set<string>;

  constructor(input: string, stateAliases?: string[]) {
    this.input = input;
    this.pos = 0;
    this.tokens = [];
    this.stateAliases = new Set(stateAliases ?? []);
  }

  /**
   * Parse the state key and return tokens.
   */
  parse(): TastyToken[] {
    // Handle empty string (default state)
    if (this.input.trim() === '') {
      return [
        {
          type: TastyTokenType.DefaultState,
          value: '',
          start: 0,
          end: 0,
        },
      ];
    }

    while (this.pos < this.input.length) {
      this.skipWhitespace();
      if (this.pos >= this.input.length) break;

      const token = this.parseNextToken();
      if (token) {
        this.tokens.push(token);
      }
    }

    return this.tokens;
  }

  private parseNextToken(): TastyToken | null {
    const char = this.input[this.pos];

    // Logical operators
    if (char === '&' || char === '|' || char === '!' || char === '^') {
      return this.parseOperator();
    }

    // Grouping parentheses
    if (char === '(' || char === ')') {
      return this.parsePunctuation();
    }

    // Pseudo-class: :hover, :focus, etc.
    if (char === ':') {
      return this.parsePseudoClass();
    }

    // Class selector: .active
    if (char === '.') {
      return this.parseClassSelector();
    }

    // Attribute selector: [aria-expanded="true"]
    if (char === '[') {
      return this.parseAttributeSelector();
    }

    // Advanced states: @media, @root, @own, @supports, @starting, or aliases
    if (char === '@') {
      return this.parseAtState();
    }

    // Boolean or value modifier
    if (isIdentifierStart(char)) {
      return this.parseModifier();
    }

    // Unknown - skip
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
   * Parse logical operators: &, |, !, ^
   */
  private parseOperator(): TastyToken {
    const start = this.pos;
    const value = this.input[this.pos];
    this.pos++;

    return {
      type: TastyTokenType.StateOperator,
      value,
      start,
      end: this.pos,
    };
  }

  /**
   * Parse parentheses for grouping
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
   * Parse pseudo-class: :hover, :focus-visible, :nth-child(2n), :has(SubElement)
   */
  private parsePseudoClass(): TastyToken {
    const start = this.pos;
    this.pos++; // skip :

    // Check for pseudo-element (::)
    const isPseudoElement = this.input[this.pos] === ':';
    if (isPseudoElement) {
      this.pos++;
    }

    // Read the pseudo-class name
    const colonPrefix = this.input.slice(start, this.pos);
    const pseudoName = this.readIdentifierWithDashes();
    let value = colonPrefix + pseudoName;

    // Check for functional pseudo-class: :nth-child(...), :has(...)
    if (this.input[this.pos] === '(') {
      // For :has(), parse the content to detect sub-elements
      if (pseudoName === 'has' || pseudoName === 'is' || pseudoName === 'where' || pseudoName === 'not') {
        return this.parseHasPseudoClass(start, colonPrefix + pseudoName);
      }
      value += this.readParenthesized();
    }

    return {
      type: TastyTokenType.PseudoClass,
      value,
      start,
      end: this.pos,
    };
  }

  /**
   * Parse :has(), :is(), :where(), :not() with sub-element detection.
   * Sub-elements are capitalized identifiers like Body, Row, Item.
   */
  private parseHasPseudoClass(start: number, pseudoName: string): TastyToken {
    const token: TastyToken = {
      type: TastyTokenType.PseudoClass,
      value: pseudoName,
      start,
      end: this.pos,
      children: [],
    };

    // Parse the parenthesized content
    if (this.input[this.pos] !== '(') {
      return token;
    }

    this.pos++; // skip (
    const contentStart = this.pos;

    // Parse tokens inside the parentheses
    while (this.pos < this.input.length && this.input[this.pos] !== ')') {
      this.skipWhitespace();
      if (this.pos >= this.input.length || this.input[this.pos] === ')') break;

      const innerToken = this.parseHasInnerToken(contentStart);
      if (innerToken) {
        token.children!.push(innerToken);
      }
    }

    if (this.input[this.pos] === ')') {
      this.pos++; // skip )
    }

    token.end = this.pos;
    token.value = this.input.slice(start, this.pos);

    return token;
  }

  /**
   * Parse a single token inside :has() content.
   */
  private parseHasInnerToken(baseOffset: number): TastyToken | null {
    this.skipWhitespace();
    if (this.pos >= this.input.length) return null;

    const char = this.input[this.pos];
    const start = this.pos;

    // Combinators: >, +, ~, (space is implicit)
    if (char === '>' || char === '+' || char === '~') {
      this.pos++;
      return {
        type: TastyTokenType.StateOperator,
        value: char,
        start,
        end: this.pos,
      };
    }

    // Comma
    if (char === ',') {
      this.pos++;
      return {
        type: TastyTokenType.Punctuation,
        value: ',',
        start,
        end: this.pos,
      };
    }

    // Pseudo-class or pseudo-element
    if (char === ':') {
      let value = ':';
      this.pos++;

      if (this.input[this.pos] === ':') {
        value += ':';
        this.pos++;
      }

      value += this.readIdentifierWithDashes();

      if (this.input[this.pos] === '(') {
        value += this.readParenthesized();
      }

      return {
        type: TastyTokenType.PseudoClass,
        value,
        start,
        end: this.pos,
      };
    }

    // Class selector
    if (char === '.') {
      this.pos++;
      const name = this.readIdentifierWithDashes();
      return {
        type: TastyTokenType.ClassSelector,
        value: '.' + name,
        start,
        end: this.pos,
      };
    }

    // Attribute selector
    if (char === '[') {
      let value = '';
      let depth = 0;

      while (this.pos < this.input.length) {
        value += this.input[this.pos];
        if (this.input[this.pos] === '[') depth++;
        if (this.input[this.pos] === ']') {
          depth--;
          this.pos++;
          if (depth === 0) break;
        } else {
          this.pos++;
        }
      }

      return {
        type: TastyTokenType.AttrSelector,
        value,
        start,
        end: this.pos,
      };
    }

    // Identifier: could be sub-element (capitalized) or regular selector
    if (isIdentifierStart(char)) {
      const name = this.readIdentifierWithDashes();

      // Sub-elements are capitalized (e.g., Body, Row, Item)
      const isCapitalized = /^[A-Z]/.test(name);

      return {
        type: isCapitalized ? TastyTokenType.SubElement : TastyTokenType.BooleanMod,
        value: name,
        start,
        end: this.pos,
      };
    }

    // Unknown - skip
    this.pos++;
    return null;
  }

  /**
   * Parse class selector: .active, .my-class
   */
  private parseClassSelector(): TastyToken {
    const start = this.pos;
    this.pos++; // skip .

    const name = this.readIdentifierWithDashes();

    return {
      type: TastyTokenType.ClassSelector,
      value: '.' + name,
      start,
      end: this.pos,
    };
  }

  /**
   * Parse attribute selector: [disabled], [data-theme="dark"]
   */
  private parseAttributeSelector(): TastyToken {
    const start = this.pos;
    let depth = 0;
    let value = '';

    while (this.pos < this.input.length) {
      const char = this.input[this.pos];
      value += char;
      if (char === '[') depth++;
      if (char === ']') {
        depth--;
        this.pos++;
        if (depth === 0) break;
      } else {
        this.pos++;
      }
    }

    return {
      type: TastyTokenType.AttrSelector,
      value,
      start,
      end: this.pos,
    };
  }

  /**
   * Parse @-prefixed states
   */
  private parseAtState(): TastyToken {
    const start = this.pos;
    this.pos++; // skip @

    // Check for container query shorthand: @(...)
    if (this.input[this.pos] === '(') {
      const token: TastyToken = {
        type: TastyTokenType.ContainerState,
        value: '@',
        start,
        end: this.pos,
        children: [],
      };
      
      this.pos++; // skip (
      
      while (this.pos < this.input.length && this.input[this.pos] !== ')') {
        this.skipWhitespace();
        if (this.pos >= this.input.length || this.input[this.pos] === ')') break;
        
        const innerToken = this.parseAtStateInnerToken();
        if (innerToken) {
          token.children!.push(innerToken);
        }
      }
      
      if (this.input[this.pos] === ')') {
        this.pos++; // skip )
      }
      
      token.end = this.pos;
      token.value = this.input.slice(start, this.pos);
      
      return token;
    }

    // Read the keyword
    const keyword = this.readIdentifierWithDashes();

    // Check if it's a state alias from config (e.g., @mobile, @dark)
    const fullValue = '@' + keyword;
    if (this.stateAliases.has(fullValue)) {
      return {
        type: TastyTokenType.StateAlias,
        value: fullValue,
        start,
        end: this.pos,
      };
    }

    // Handle built-in @ states
    switch (keyword) {
      case 'media':
        return this.parseMediaState(start);

      case 'supports':
        return this.parseSupportsState(start);

      case 'root':
        return this.parseRootState(start);

      case 'own':
        return this.parseOwnState(start);

      case 'starting':
        return {
          type: TastyTokenType.StartingState,
          value: '@starting',
          start,
          end: this.pos,
        };

      case 'keyframes':
        return {
          type: TastyTokenType.AtRule,
          value: '@keyframes',
          start,
          end: this.pos,
        };

      case 'properties':
        return {
          type: TastyTokenType.AtRule,
          value: '@properties',
          start,
          end: this.pos,
        };

      default:
        // Could be a state alias without explicit registration
        return {
          type: TastyTokenType.StateAlias,
          value: '@' + keyword,
          start,
          end: this.pos,
        };
    }
  }

  /**
   * Parse @media(...) state with granular tokenization
   */
  private parseMediaState(start: number): TastyToken {
    const keywordEnd = this.pos;
    
    // Create the @media keyword token
    const keywordToken: TastyToken = {
      type: TastyTokenType.MediaState,
      value: '@media',
      start,
      end: keywordEnd,
      children: [],
    };

    // Parse the parentheses content if present
    if (this.input[this.pos] === '(') {
      const parenStart = this.pos;
      this.pos++; // skip (
      
      // Parse tokens inside the parentheses
      while (this.pos < this.input.length && this.input[this.pos] !== ')') {
        this.skipWhitespace();
        if (this.pos >= this.input.length || this.input[this.pos] === ')') break;
        
        const innerToken = this.parseMediaQueryToken();
        if (innerToken) {
          keywordToken.children!.push(innerToken);
        }
      }
      
      if (this.input[this.pos] === ')') {
        this.pos++; // skip )
      }
      
      keywordToken.end = this.pos;
      keywordToken.value = this.input.slice(start, this.pos);
    }

    return keywordToken;
  }

  /**
   * Parse a single token inside a media query
   */
  private parseMediaQueryToken(): TastyToken | null {
    this.skipWhitespace();
    if (this.pos >= this.input.length) return null;
    
    const char = this.input[this.pos];
    const start = this.pos;
    
    // Comparison operators: <=, >=, <, >, =
    if (char === '<' || char === '>' || char === '=') {
      return this.parseComparisonOperator(start);
    }
    
    // Number with optional unit
    if (isDigit(char) || (char === '.' && isDigit(this.input[this.pos + 1] || ''))) {
      return this.parseNumberWithUnit(start);
    }
    
    // Identifier (w, h, width, height, etc.)
    if (isIdentifierStart(char)) {
      const ident = this.readIdentifierWithDashes();
      return {
        type: TastyTokenType.Identifier,
        value: ident,
        start,
        end: this.pos,
      };
    }
    
    // Skip unknown characters
    this.pos++;
    return null;
  }

  /**
   * Parse a number with optional unit (shared by parseMediaQueryToken and parseAtStateInnerToken)
   */
  private parseNumberWithUnit(start: number): TastyToken {
    let numStr = '';
    
    // Read digits before decimal
    while (this.pos < this.input.length && isDigit(this.input[this.pos])) {
      numStr += this.input[this.pos];
      this.pos++;
    }
    
    // Read decimal part
    if (this.input[this.pos] === '.' && isDigit(this.input[this.pos + 1] || '')) {
      numStr += '.';
      this.pos++;
      while (this.pos < this.input.length && isDigit(this.input[this.pos])) {
        numStr += this.input[this.pos];
        this.pos++;
      }
    }
    
    // Read unit
    const unitStart = this.pos;
    while (this.pos < this.input.length && /[a-zA-Z%]/.test(this.input[this.pos])) {
      this.pos++;
    }
    const unit = this.input.slice(unitStart, this.pos);
    
    return {
      type: unit ? TastyTokenType.CssUnit : TastyTokenType.Number,
      value: numStr + unit,
      start,
      end: this.pos,
    };
  }

  /**
   * Parse comparison operators: <=, >=, <, >, =
   */
  private parseComparisonOperator(start: number): TastyToken {
    let op = this.input[this.pos];
    this.pos++;
    if (this.input[this.pos] === '=') {
      op += '=';
      this.pos++;
    }
    return {
      type: TastyTokenType.StateOperator,
      value: op,
      start,
      end: this.pos,
    };
  }

  /**
   * Parse @supports(...) state with granular tokenization
   */
  private parseSupportsState(start: number): TastyToken {
    return this.parseAtStateWithParens(start, '@supports', TastyTokenType.SupportsState);
  }

  /**
   * Parse @root(...) state with granular tokenization
   */
  private parseRootState(start: number): TastyToken {
    return this.parseAtStateWithParens(start, '@root', TastyTokenType.RootState);
  }

  /**
   * Parse @own(...) state with granular tokenization
   */
  private parseOwnState(start: number): TastyToken {
    return this.parseAtStateWithParens(start, '@own', TastyTokenType.OwnState);
  }

  /**
   * Generic parser for @ states with parentheses
   */
  private parseAtStateWithParens(start: number, keyword: string, tokenType: TastyTokenType): TastyToken {
    const keywordEnd = this.pos;
    
    const token: TastyToken = {
      type: tokenType,
      value: keyword,
      start,
      end: keywordEnd,
      children: [],
    };

    if (this.input[this.pos] === '(') {
      this.pos++; // skip (
      
      while (this.pos < this.input.length && this.input[this.pos] !== ')') {
        this.skipWhitespace();
        if (this.pos >= this.input.length || this.input[this.pos] === ')') break;
        
        const innerToken = this.parseAtStateInnerToken();
        if (innerToken) {
          token.children!.push(innerToken);
        }
      }
      
      if (this.input[this.pos] === ')') {
        this.pos++; // skip )
      }
      
      token.end = this.pos;
      token.value = this.input.slice(start, this.pos);
    }

    return token;
  }

  /**
   * Parse tokens inside @ state parentheses
   */
  private parseAtStateInnerToken(): TastyToken | null {
    this.skipWhitespace();
    if (this.pos >= this.input.length) return null;
    
    const char = this.input[this.pos];
    const start = this.pos;
    
    // Comparison operators: =, <, >, <=, >=
    if (char === '<' || char === '>' || char === '=') {
      return this.parseComparisonOperator(start);
    }
    
    // Logical operators: &, |, !
    if (char === '&' || char === '|' || char === '!') {
      this.pos++;
      return {
        type: TastyTokenType.StateOperator,
        value: char,
        start,
        end: this.pos,
      };
    }
    
    // Comma separator
    if (char === ',') {
      this.pos++;
      return {
        type: TastyTokenType.Punctuation,
        value: ',',
        start,
        end: this.pos,
      };
    }
    
    // Number with optional unit
    if (isDigit(char) || (char === '.' && isDigit(this.input[this.pos + 1] || ''))) {
      return this.parseNumberWithUnit(start);
    }
    
    // Identifier or value modifier (theme=dark)
    if (isIdentifierStart(char)) {
      return this.parseIdentifierOrValueMod(start);
    }
    
    // Skip unknown
    this.pos++;
    return null;
  }

  /**
   * Parse an identifier that may be a value modifier (name=value)
   */
  private parseIdentifierOrValueMod(start: number): TastyToken {
    const ident = this.readIdentifierWithDashes();
    
    // Check for value modifier: name=value
    if (this.input[this.pos] === '=') {
      this.pos++; // skip =
      let value = ident + '=';
      
      if (this.input[this.pos] === '"' || this.input[this.pos] === "'") {
        const quote = this.input[this.pos];
        this.pos++;
        value += quote;
        while (this.pos < this.input.length && this.input[this.pos] !== quote) {
          value += this.input[this.pos];
          this.pos++;
        }
        if (this.input[this.pos] === quote) {
          value += quote;
          this.pos++;
        }
      } else {
        value += this.readIdentifierWithDashes();
      }
      
      return {
        type: TastyTokenType.ValueMod,
        value,
        start,
        end: this.pos,
      };
    }
    
    return {
      type: TastyTokenType.BooleanMod,
      value: ident,
      start,
      end: this.pos,
    };
  }

  /**
   * Parse boolean modifier (hovered) or value modifier (theme=dark)
   */
  private parseModifier(): TastyToken {
    const start = this.pos;
    const name = this.readIdentifierWithDashes();

    // Check for value modifier: theme=dark or size="large"
    if (this.input[this.pos] === '=') {
      this.pos++; // skip =

      let value = name + '=';

      // Check for quoted value
      if (this.input[this.pos] === '"' || this.input[this.pos] === "'") {
        const quote = this.input[this.pos];
        this.pos++;
        value += quote;

        while (this.pos < this.input.length && this.input[this.pos] !== quote) {
          if (this.input[this.pos] === '\\' && this.pos + 1 < this.input.length) {
            value += this.input[this.pos] + this.input[this.pos + 1];
            this.pos += 2;
          } else {
            value += this.input[this.pos];
            this.pos++;
          }
        }

        if (this.input[this.pos] === quote) {
          value += quote;
          this.pos++;
        }
      } else {
        // Unquoted value
        value += this.readIdentifierWithDashes();
      }

      return {
        type: TastyTokenType.ValueMod,
        value,
        start,
        end: this.pos,
      };
    }

    // Boolean modifier
    return {
      type: TastyTokenType.BooleanMod,
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

  private readIdentifierWithDashes(): string {
    let result = '';
    while (this.pos < this.input.length && isIdentifierCharWithDash(this.input[this.pos])) {
      result += this.input[this.pos];
      this.pos++;
    }
    return result;
  }

  /**
   * Read a parenthesized expression including the parens
   */
  private readParenthesized(): string {
    if (this.input[this.pos] !== '(') return '';

    let result = '';
    let depth = 0;

    while (this.pos < this.input.length) {
      const char = this.input[this.pos];
      result += char;

      if (char === '(') depth++;
      if (char === ')') {
        depth--;
        this.pos++;
        if (depth === 0) break;
      } else {
        this.pos++;
      }
    }

    return result;
  }
}

/**
 * Parse a tasty state key string.
 */
export function parseStateKey(input: string, stateAliases?: string[]): TastyToken[] {
  const parser = new StateKeyParser(input, stateAliases);
  return parser.parse();
}

/**
 * Check if a string looks like a state key (contains state-like patterns).
 */
export function isStateKey(key: string): boolean {
  // Empty string is the default state
  if (key === '') return true;

  // State key patterns
  const statePatterns = [
    /^[a-z][a-z0-9-]*$/, // Boolean modifier: hovered
    /^[a-z][a-z0-9-]*=/, // Value modifier: theme=dark
    /^:/, // Pseudo-class: :hover
    /^\./, // Class selector: .active
    /^\[/, // Attribute selector: [disabled]
    /^@/, // Advanced state: @media, @root, @mobile
    /[&|!^]/, // Contains logical operators
  ];

  return statePatterns.some((pattern) => pattern.test(key));
}

/**
 * Check if a property key is a sub-element (capitalized).
 */
export function isSubElement(key: string): boolean {
  return /^[A-Z]/.test(key) && !/^@/.test(key);
}

/**
 * Token type for selector affix parsing.
 */
export enum SelectorAffixTokenType {
  Combinator = 'combinator', // >, +, ~, (space)
  SubElement = 'subElement', // Body, Row (capitalized)
  HtmlTag = 'htmlTag', // ul, li, div
  PseudoElement = 'pseudoElement', // ::before, ::after
  PseudoClass = 'pseudoClass', // :hover, :focus
  ClassSelector = 'classSelector', // .active
  AttrSelector = 'attrSelector', // [disabled]
  Placeholder = 'placeholder', // @ (key position marker)
  Punctuation = 'punctuation', // comma
}

/**
 * A parsed token from a selector affix string.
 */
export interface SelectorAffixToken {
  type: SelectorAffixTokenType;
  value: string;
  start: number;
  end: number;
}

/**
 * Parse a selector affix string (the $ property value).
 *
 * Patterns:
 * - ">" - direct child combinator
 * - ">Body>Row>" - chained elements with combinators
 * - "::before" - pseudo-element
 * - ">@:hover" - key with pseudo-class (@ marks key position)
 * - ">Item+" - after sibling combinator
 * - "::before, ::after" - multiple selectors
 */
export function parseSelectorAffix(input: string): SelectorAffixToken[] {
  const tokens: SelectorAffixToken[] = [];
  let pos = 0;

  while (pos < input.length) {
    // Skip whitespace
    while (pos < input.length && /\s/.test(input[pos])) {
      pos++;
    }

    if (pos >= input.length) break;

    const char = input[pos];
    const start = pos;

    // Combinators: >, +, ~
    if (char === '>' || char === '+' || char === '~') {
      pos++;
      tokens.push({
        type: SelectorAffixTokenType.Combinator,
        value: char,
        start,
        end: pos,
      });
      continue;
    }

    // Comma separator
    if (char === ',') {
      pos++;
      tokens.push({
        type: SelectorAffixTokenType.Punctuation,
        value: ',',
        start,
        end: pos,
      });
      continue;
    }

    // @ placeholder (marks where the key should be inserted)
    if (char === '@') {
      pos++;
      tokens.push({
        type: SelectorAffixTokenType.Placeholder,
        value: '@',
        start,
        end: pos,
      });
      continue;
    }

    // Pseudo-element or pseudo-class: :, ::
    if (char === ':') {
      let value = ':';
      pos++;

      // Check for double colon (pseudo-element)
      if (input[pos] === ':') {
        value += ':';
        pos++;
      }

      // Read the identifier
      while (pos < input.length && /[a-zA-Z0-9_-]/.test(input[pos])) {
        value += input[pos];
        pos++;
      }

      // Check for functional pseudo-class: :nth-child(...)
      if (input[pos] === '(') {
        let depth = 0;
        while (pos < input.length) {
          value += input[pos];
          if (input[pos] === '(') depth++;
          if (input[pos] === ')') {
            depth--;
            pos++;
            if (depth === 0) break;
          } else {
            pos++;
          }
        }
      }

      tokens.push({
        type: value.startsWith('::')
          ? SelectorAffixTokenType.PseudoElement
          : SelectorAffixTokenType.PseudoClass,
        value,
        start,
        end: pos,
      });
      continue;
    }

    // Class selector: .active
    if (char === '.') {
      let value = '.';
      pos++;

      while (pos < input.length && /[a-zA-Z0-9_-]/.test(input[pos])) {
        value += input[pos];
        pos++;
      }

      tokens.push({
        type: SelectorAffixTokenType.ClassSelector,
        value,
        start,
        end: pos,
      });
      continue;
    }

    // Attribute selector: [disabled]
    if (char === '[') {
      let value = '';
      let depth = 0;

      while (pos < input.length) {
        value += input[pos];
        if (input[pos] === '[') depth++;
        if (input[pos] === ']') {
          depth--;
          pos++;
          if (depth === 0) break;
        } else {
          pos++;
        }
      }

      tokens.push({
        type: SelectorAffixTokenType.AttrSelector,
        value,
        start,
        end: pos,
      });
      continue;
    }

    // Identifier: could be sub-element (capitalized) or HTML tag (lowercase)
    if (/[a-zA-Z_]/.test(char)) {
      let value = '';

      while (pos < input.length && /[a-zA-Z0-9_-]/.test(input[pos])) {
        value += input[pos];
        pos++;
      }

      // Determine if it's a sub-element (capitalized) or HTML tag
      const isCapitalized = /^[A-Z]/.test(value);

      tokens.push({
        type: isCapitalized
          ? SelectorAffixTokenType.SubElement
          : SelectorAffixTokenType.HtmlTag,
        value,
        start,
        end: pos,
      });
      continue;
    }

    // Unknown - skip
    pos++;
  }

  return tokens;
}
