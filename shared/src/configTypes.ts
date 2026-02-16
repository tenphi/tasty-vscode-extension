/**
 * Tasty Extension Configuration Types
 *
 * These types define the structure of the tasty.config.ts file
 * that users can create to configure validation and autocomplete.
 */

export interface TastyExtensionConfig {
  /**
   * Extend another config file. Path is relative to this config file.
   * The extended config is merged first, then this config's values are added.
   * @example '../tasty.config.ts'
   */
  extends?: string;

  /**
   * Valid token names for validation and autocomplete.
   * Use # prefix for colors, $ prefix for custom properties.
   * Set to `false` to disable token validation (overrides parent).
   * @example ['#primary', '#danger', '$spacing', '$gap']
   */
  tokens?: false | string[];

  /**
   * Valid custom unit names.
   * Set to `false` to disable unit validation (overrides parent).
   * @example ['x', 'r', 'bw', 'cols']
   */
  units?: false | string[];

  /**
   * Valid custom function names.
   * Set to `false` to disable function validation (overrides parent).
   * @example ['clamp', 'double']
   */
  funcs?: false | string[];

  /**
   * State alias names for autocomplete.
   * Must start with @ prefix.
   * @example ['@mobile', '@tablet', '@dark']
   */
  states?: string[];

  /**
   * Valid preset names for the `preset` style property.
   * Tasty has no built-in presets - they are project-specific.
   * @example ['h1', 'h2', 'h3', 't1', 't2', 't3', 'tag']
   */
  presets?: string[];

  /**
   * Descriptions for tokens, shown on hover.
   * Keys should match the token names (with # or $ prefix).
   * @example { '#primary': 'Primary brand color', '$spacing': 'Base spacing unit' }
   */
  tokenDescriptions?: Record<string, string>;

  /**
   * Descriptions for presets, shown on hover.
   * @example { 'h1': 'Main page heading (32px, bold)' }
   */
  presetDescriptions?: Record<string, string>;

  /**
   * Valid recipe names for the `recipe` style property.
   * Recipes are predefined, named style bundles registered via configure({ recipes }).
   * @example ['card', 'elevated', 'rounded']
   */
  recipes?: string[];

  /**
   * Descriptions for recipes, shown on hover.
   * @example { 'card': 'Card layout with padding, border, and radius' }
   */
  recipeDescriptions?: Record<string, string>;

  /**
   * Descriptions for state aliases, shown on hover.
   * Provides human-readable explanations of what each state alias means.
   * @example { '@mobile': 'Mobile viewport (width < 768px)', '@dark': 'Dark theme mode' }
   */
  stateDescriptions?: Record<string, string>;
}

/**
 * Built-in units that are always available.
 * These are defined in tasty core and cannot be removed.
 */
export const BUILT_IN_UNITS = ['x', 'r', 'cr', 'bw', 'ow', 'fs', 'lh', 'sf'];

/**
 * Preset modifiers are built-in and cannot be customized.
 * They can be combined with any preset (e.g., 't1 strong', 'h2 italic').
 */
export const PRESET_MODIFIERS = ['strong', 'italic', 'icon', 'tight'];

/**
 * Merged configuration result.
 * This is what the server uses after resolving all config files.
 */
export interface MergedConfig {
  /** All valid tokens (combined from hierarchy) */
  tokens: string[] | false;
  /** All valid units (combined from hierarchy) */
  units: string[] | false;
  /** All valid functions (combined from hierarchy) */
  funcs: string[] | false;
  /** All state aliases */
  states: string[];
  /** All valid presets */
  presets: string[];
  /** All valid recipes */
  recipes: string[];
  /** Token descriptions for hover */
  tokenDescriptions: Record<string, string>;
  /** Preset descriptions for hover */
  presetDescriptions: Record<string, string>;
  /** Recipe descriptions for hover */
  recipeDescriptions: Record<string, string>;
  /** State alias descriptions for hover */
  stateDescriptions: Record<string, string>;
}

/**
 * Create an empty merged config.
 */
export function createEmptyConfig(): MergedConfig {
  return {
    tokens: false,
    units: [...BUILT_IN_UNITS],
    funcs: false,
    states: [],
    presets: [],
    recipes: [],
    tokenDescriptions: {},
    presetDescriptions: {},
    recipeDescriptions: {},
    stateDescriptions: {},
  };
}

/**
 * Merge two configs together.
 * Arrays are combined and deduplicated.
 * `false` values override arrays (disables validation).
 */
export function mergeConfigs(
  base: MergedConfig,
  override: Partial<TastyExtensionConfig>,
): MergedConfig {
  const result: MergedConfig = { ...base };

  // Handle tokens
  if (override.tokens === false) {
    result.tokens = false;
  } else if (Array.isArray(override.tokens)) {
    if (result.tokens === false) {
      result.tokens = [...override.tokens];
    } else {
      result.tokens = [...new Set([...result.tokens, ...override.tokens])];
    }
  }

  // Handle units
  if (override.units === false) {
    result.units = false;
  } else if (Array.isArray(override.units)) {
    if (result.units === false) {
      result.units = [...override.units];
    } else {
      result.units = [...new Set([...result.units, ...override.units])];
    }
  }

  // Handle funcs
  if (override.funcs === false) {
    result.funcs = false;
  } else if (Array.isArray(override.funcs)) {
    if (result.funcs === false) {
      result.funcs = [...override.funcs];
    } else {
      result.funcs = [...new Set([...result.funcs, ...override.funcs])];
    }
  }

  // Handle states (always merge arrays)
  if (Array.isArray(override.states)) {
    result.states = [...new Set([...result.states, ...override.states])];
  }

  // Handle presets (always merge arrays)
  if (Array.isArray(override.presets)) {
    result.presets = [...new Set([...result.presets, ...override.presets])];
  }

  // Handle recipes (always merge arrays)
  if (Array.isArray(override.recipes)) {
    result.recipes = [...new Set([...result.recipes, ...override.recipes])];
  }

  // Handle tokenDescriptions (merge objects)
  if (override.tokenDescriptions) {
    result.tokenDescriptions = { ...result.tokenDescriptions, ...override.tokenDescriptions };
  }

  // Handle presetDescriptions (merge objects)
  if (override.presetDescriptions) {
    result.presetDescriptions = { ...result.presetDescriptions, ...override.presetDescriptions };
  }

  // Handle recipeDescriptions (merge objects)
  if (override.recipeDescriptions) {
    result.recipeDescriptions = { ...result.recipeDescriptions, ...override.recipeDescriptions };
  }

  // Handle stateDescriptions (merge objects)
  if (override.stateDescriptions) {
    result.stateDescriptions = { ...result.stateDescriptions, ...override.stateDescriptions };
  }

  return result;
}
