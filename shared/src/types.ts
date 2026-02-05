/**
 * Shared types between client and server
 */

/**
 * Semantic token types for tasty syntax highlighting.
 */
export const SEMANTIC_TOKEN_TYPES = [
  'property', // Style property names (padding, fill, radius)
  'variable', // Custom properties ($spacing)
  'type', // Color tokens (#primary)
  'number', // Units and numeric values (2x, 1r)
  'keyword', // State modifiers (hovered, pressed)
  'operator', // Logical operators (&, |, !, ^)
  'namespace', // Sub-elements (Title, Content)
  'function', // Functions (calc, rgb)
  'string', // String values
  'enumMember', // Preset values (h1, t2)
  'macro', // At-rules (@keyframes, @properties)
  'regexp', // Selectors in tastyStatic
] as const;

export type SemanticTokenType = (typeof SEMANTIC_TOKEN_TYPES)[number];

/**
 * Semantic token modifiers for tasty syntax highlighting.
 */
export const SEMANTIC_TOKEN_MODIFIERS = [
  'definition', // Token is being defined
  'reference', // Token is being referenced
  'declaration', // Property declaration
  'defaultLibrary', // Built-in token/unit
  'readonly', // Read-only value
  'deprecated', // Deprecated feature
] as const;

export type SemanticTokenModifier = (typeof SEMANTIC_TOKEN_MODIFIERS)[number];

/**
 * Token types for the tasty value parser.
 */
export enum TastyTokenType {
  // Values
  ColorToken = 'colorToken', // #primary, #purple.5
  HexColor = 'hexColor', // #fff, #aabbcc
  CustomProperty = 'customProperty', // $spacing
  CustomPropertyName = 'customPropertyName', // $$rotation
  ColorTokenName = 'colorTokenName', // ##accent
  CustomUnit = 'customUnit', // 2x, 1r
  CssUnit = 'cssUnit', // 16px, 1.5em
  Number = 'number', // 123, 1.5
  Boolean = 'boolean', // true, false
  Preset = 'preset', // h1, t2
  PresetModifier = 'presetModifier', // strong, italic
  Direction = 'direction', // top, left, bottom, right
  Function = 'function', // calc, rgb, url
  String = 'string', // 'value', "value"
  Identifier = 'identifier', // Generic identifier
  Operator = 'operator', // +, -, *, /

  // State keys
  DefaultState = 'defaultState', // '' (empty string)
  BooleanMod = 'booleanMod', // hovered, pressed
  ValueMod = 'valueMod', // theme=danger
  PseudoClass = 'pseudoClass', // :hover, :focus
  ClassSelector = 'classSelector', // .active
  AttrSelector = 'attrSelector', // [aria-expanded="true"]
  MediaState = 'mediaState', // @media(w < 768px)
  ContainerState = 'containerState', // @(card, w >= 400px)
  SupportsState = 'supportsState', // @supports(display: grid)
  RootState = 'rootState', // @root(theme=dark)
  OwnState = 'ownState', // @own(hovered)
  StartingState = 'startingState', // @starting
  StateOperator = 'stateOperator', // &, |, !, ^
  StateAlias = 'stateAlias', // @mobile, @dark (from config)

  // Special
  SubElement = 'subElement', // Title, Content (capitalized keys)
  SelectorAffix = 'selectorAffix', // $ property
  AtRule = 'atRule', // @keyframes, @properties
  Punctuation = 'punctuation', // (, ), {, }, [, ], :, ,
  Whitespace = 'whitespace',
  Unknown = 'unknown',
}

/**
 * A parsed token from a tasty value string.
 */
export interface TastyToken {
  type: TastyTokenType;
  value: string;
  start: number;
  end: number;
  /** For nested structures like functions */
  children?: TastyToken[];
}

/**
 * Context types for tasty style detection.
 */
export enum TastyContextType {
  /** Inside tasty() function call - styles property */
  TastyStyles = 'tastyStyles',
  /** Inside tasty() function call - variants property */
  TastyVariants = 'tastyVariants',
  /** Inside tasty() function call - tokens property */
  TastyTokens = 'tastyTokens',
  /** Inside tastyStatic() single argument */
  StaticStyles = 'staticStyles',
  /** Inside tastyStatic() with base extension */
  StaticExtension = 'staticExtension',
  /** Inside tastyStatic() with selector */
  StaticSelector = 'staticSelector',
  /** Inside a Styles type annotation */
  StylesType = 'stylesType',
  /** Inside styles prop on JSX */
  StylesProp = 'stylesProp',
  /** Variable ending with *styles/*Styles (heuristic) */
  StylesVariable = 'stylesVariable',
  /** JSX style prop like gap="2x", fill="#primary" */
  JsxStyleProp = 'jsxStyleProp',
}

/**
 * Detected tasty context in a document.
 */
export interface TastyContext {
  type: TastyContextType;
  /** Start offset in the document */
  start: number;
  /** End offset in the document */
  end: number;
  /** For selector mode: the CSS selector string */
  selector?: string;
}

/**
 * A diagnostic message for validation.
 */
export interface TastyDiagnostic {
  message: string;
  severity: 'error' | 'warning' | 'info' | 'hint';
  start: number;
  end: number;
  code?: string;
  /** Suggested fixes */
  suggestions?: string[];
}

/**
 * Configuration for the language server.
 */
export interface ServerSettings {
  enable: boolean;
  enableSemanticHighlighting: boolean;
  enableDiagnostics: boolean;
  enableAutoComplete: boolean;
  hoverPreview: boolean;
  configPath?: string;
  trace: {
    server: 'off' | 'messages' | 'verbose';
  };
}

/**
 * Default server settings.
 */
export const DEFAULT_SERVER_SETTINGS: ServerSettings = {
  enable: true,
  enableSemanticHighlighting: true,
  enableDiagnostics: true,
  enableAutoComplete: true,
  hoverPreview: true,
  trace: {
    server: 'off',
  },
};

/**
 * Recursively visit all tokens in a token tree.
 *
 * @param tokens - The tokens to visit
 * @param visitor - Callback function called for each token with token and depth
 * @param depth - Current depth in the tree (default 0)
 */
export function visitTokens(
  tokens: TastyToken[],
  visitor: (token: TastyToken, depth: number) => void,
  depth = 0,
): void {
  for (const token of tokens) {
    visitor(token, depth);
    if (token.children) {
      visitTokens(token.children, visitor, depth + 1);
    }
  }
}

/**
 * Recursively collect tokens matching a predicate.
 *
 * @param tokens - The tokens to search
 * @param predicate - Function that returns true for tokens to collect
 * @returns Array of matching tokens
 */
export function collectTokens(
  tokens: TastyToken[],
  predicate: (token: TastyToken) => boolean,
): TastyToken[] {
  const result: TastyToken[] = [];

  visitTokens(tokens, (token) => {
    if (predicate(token)) {
      result.push(token);
    }
  });

  return result;
}

/**
 * Find the first token matching a predicate.
 *
 * @param tokens - The tokens to search
 * @param predicate - Function that returns true for the token to find
 * @returns The first matching token or undefined
 */
export function findToken(
  tokens: TastyToken[],
  predicate: (token: TastyToken) => boolean,
): TastyToken | undefined {
  for (const token of tokens) {
    if (predicate(token)) {
      return token;
    }
    if (token.children) {
      const found = findToken(token.children, predicate);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
}
