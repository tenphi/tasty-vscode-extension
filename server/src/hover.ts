/**
 * Hover Provider
 *
 * Provides hover information for tasty styles.
 */

import { Hover, MarkupKind } from 'vscode-languageserver/node';
import { MergedConfig } from '../../shared/src/configTypes';
import {
  ALL_STYLE_PROPERTIES,
  BUILT_IN_UNITS,
  PRESET_MODIFIERS,
  DIRECTION_MODIFIERS,
  getUnitDescription,
} from './builtins';
import { LocalDefinitions, createEmptyLocalDefinitions } from './localDefinitions';

/**
 * Hover context information.
 */
export interface HoverContext {
  /** The word/token under the cursor */
  word: string;
  /** The full line text */
  line: string;
  /** Is this a property name? */
  isPropertyName: boolean;
  /** Is this a property value? */
  isPropertyValue: boolean;
  /** The property name if we're hovering over a value */
  propertyName?: string;
}

/**
 * Get hover information based on context.
 */
export function getHoverInfo(
  context: HoverContext,
  config: MergedConfig,
  localDefs: LocalDefinitions = createEmptyLocalDefinitions(),
): Hover | null {
  const { word } = context;

  if (context.isPropertyName) {
    return getPropertyHover(word);
  }

  // Check for color token
  if (word.startsWith('#')) {
    return getColorTokenHover(word, config, localDefs);
  }

  // Check for custom property
  if (word.startsWith('$')) {
    return getCustomPropertyHover(word, config, localDefs);
  }

  // Check for unit
  const unitMatch = word.match(/^([0-9.]+)([a-z]+)$/);
  if (unitMatch) {
    return getUnitHover(unitMatch[1], unitMatch[2], config);
  }

  // Check for preset
  if (config.presets.includes(word)) {
    return getPresetHover(word, config);
  }

  // Check for recipe
  if (config.recipes.includes(word)) {
    return getRecipeHover(word, config);
  }

  // Check for preset modifier
  if (PRESET_MODIFIERS.includes(word)) {
    return getPresetModifierHover(word);
  }

  // Check for direction
  if (DIRECTION_MODIFIERS.includes(word)) {
    return getDirectionHover(word);
  }

  // Check for state alias
  if (word.startsWith('@') && config.states.includes(word)) {
    return getStateAliasHover(word, config);
  }

  // Check for local state
  if (localDefs.states.has(word)) {
    return getLocalStateHover(word);
  }

  // Check for :has() pseudo-class (special tasty feature with sub-elements)
  if (word.startsWith(':has(') || word === ':has') {
    return getHasSelectorHover();
  }

  return null;
}

/**
 * Get hover for the :has() pseudo-class explaining sub-element patterns.
 */
function getHasSelectorHover(): Hover {
  return {
    contents: {
      kind: MarkupKind.Markdown,
      value: `**:has() Selector** (Tasty enhanced)

In Tasty, capitalized identifiers inside \`:has()\` become \`[data-element="..."]\` selectors.

**Examples:**
- \`:has(Body)\` → \`:has([data-element="Body"])\`
- \`:has(Body > Row)\` → \`:has([data-element="Body"] > [data-element="Row"])\`
- \`:has(Header:hover)\` → \`:has([data-element="Header"]:hover)\`

This enables targeting sub-elements of your component using CSS-native \`:has()\` queries.`,
    },
  };
}

/**
 * Get hover for a property name.
 */
function getPropertyHover(name: string): Hover | null {
  const isBuiltIn = ALL_STYLE_PROPERTIES.includes(name);

  if (!isBuiltIn) {
    return null;
  }

  return {
    contents: {
      kind: MarkupKind.Markdown,
      value: `**${name}** *(Tasty style property)*`,
    },
  };
}

/**
 * Get hover for a color token.
 */
function getColorTokenHover(
  token: string,
  config: MergedConfig,
  localDefs: LocalDefinitions,
): Hover | null {
  // Handle ## (color token name reference) - outputs --name-color
  if (token.startsWith('##')) {
    const name = token.slice(2);
    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: `**Color Property Name Reference**: \`##${name}\`\n\nReferences the CSS property \`--${name}-color\`\n\nUsed in properties like \`transition\` or \`will-change\` where you need the property name, not its value.`,
      },
    };
  }

  // Extract base token (without opacity suffix like .5 or .05)
  const opacityMatch = token.match(/^(#[a-z][a-z0-9-]*)\.([0-9]+|\$[a-z][a-z0-9-]*)$/i);
  const baseToken = opacityMatch ? opacityMatch[1] : token;
  
  // Special handling for #current reserved token
  if (baseToken === '#current') {
    let content = `**#current** *(reserved)*\n\nMaps to CSS \`currentcolor\`.`;
    content += `\n\n- \`#current\` → currentcolor`;
    content += `\n- \`#current.5\` → color-mix(in oklab, currentcolor 50%, transparent)`;
    
    // Add opacity info if present
    if (opacityMatch) {
      const opacity = opacityMatch[2];
      if (opacity.startsWith('$')) {
        content += `\n\nUsing dynamic opacity: \`${opacity}\``;
      } else {
        const opacityPercent = parseInt(opacity) * (opacity.length === 1 ? 10 : 1);
        content += `\n\nWith ${opacityPercent}% opacity`;
      }
    }
    
    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: content,
      },
    };
  }
  
  // Check if base token is known (config or local)
  const isInConfig = Array.isArray(config.tokens) && config.tokens.includes(baseToken);
  const isLocal = localDefs.tokens.has(baseToken);

  let content = `**Color Token**: \`${token}\``;

  // Add description from config if available
  const description = config.tokenDescriptions?.[baseToken];
  if (description) {
    content += `\n\n${description}`;
  }

  if (isLocal) {
    content += '\n\n*Defined locally in this file*';
  } else if (isInConfig) {
    content += '\n\n*Defined in config*';
  } else if (config.tokens !== false) {
    content += '\n\n⚠️ *Unknown token (not in config)*';
  }

  // Add opacity info if present
  if (opacityMatch) {
    const [, colorName, opacity] = opacityMatch;
    if (opacity.startsWith('$')) {
      content += `\n\nColor \`${colorName}\` with dynamic opacity \`${opacity}\``;
    } else {
      const opacityPercent = parseInt(opacity) * (opacity.length === 1 ? 10 : 1);
      content += `\n\nColor \`${colorName}\` with ${opacityPercent}% opacity`;
    }
  }

  return {
    contents: {
      kind: MarkupKind.Markdown,
      value: content,
    },
  };
}

/**
 * Get hover for a custom property.
 */
function getCustomPropertyHover(
  prop: string,
  config: MergedConfig,
  localDefs: LocalDefinitions,
): Hover | null {
  const isInConfig = Array.isArray(config.tokens) && config.tokens.includes(prop);
  const isLocal = localDefs.tokens.has(prop);

  let content = `**Custom Property**: \`${prop}\``;

  // Handle $$ (property name reference)
  if (prop.startsWith('$$')) {
    const name = prop.slice(2);
    content = `**Property Name Reference**: \`$$${name}\`\n\nReferences the CSS property \`--${name}\``;
  } else {
    // Add description from config if available
    const description = config.tokenDescriptions?.[prop];
    if (description) {
      content += `\n\n${description}`;
    }

    if (isLocal) {
      content += '\n\n*Defined locally in this file*';
    } else if (isInConfig) {
      content += '\n\n*Defined in config*';
    } else if (config.tokens !== false) {
      content += '\n\n⚠️ *Unknown property (not in config)*';
    }
  }

  return {
    contents: {
      kind: MarkupKind.Markdown,
      value: content,
    },
  };
}

/**
 * Get hover for a unit value.
 */
function getUnitHover(value: string, unit: string, config: MergedConfig): Hover | null {
  const isBuiltIn = BUILT_IN_UNITS.includes(unit);
  const isCustom = Array.isArray(config.units) && config.units.includes(unit);

  if (!isBuiltIn && !isCustom) {
    return null;
  }

  const baseDescription = getUnitDescription(unit);
  const formattedValue = `\`${value}${unit}\``;

  return {
    contents: {
      kind: MarkupKind.Markdown,
      value: `**Tasty Unit**: ${formattedValue}\n\n${baseDescription}`,
    },
  };
}

/**
 * Get hover for a preset.
 */
function getPresetHover(preset: string, config: MergedConfig): Hover {
  let content = `**Typography Preset**: \`${preset}\``;
  
  // Add description from config if available
  const description = config.presetDescriptions?.[preset];
  if (description) {
    content += `\n\n${description}`;
  }
  
  content += `\n\nCan be combined with modifiers: \`${preset} strong\`, \`${preset} italic\``;
  
  return {
    contents: {
      kind: MarkupKind.Markdown,
      value: content,
    },
  };
}

/**
 * Get hover for a recipe.
 */
function getRecipeHover(recipe: string, config: MergedConfig): Hover {
  let content = `**Style Recipe**: \`${recipe}\``;
  
  const description = config.recipeDescriptions?.[recipe];
  if (description) {
    content += `\n\n${description}`;
  }
  
  content += `\n\nCompose multiple recipes: \`recipe: '${recipe}, other'\``;
  
  return {
    contents: {
      kind: MarkupKind.Markdown,
      value: content,
    },
  };
}

/**
 * Get hover for a preset modifier.
 */
function getPresetModifierHover(modifier: string): Hover {
  let description: string;
  switch (modifier) {
    case 'strong':
      description = 'Applies bold/semibold font weight';
      break;
    case 'italic':
      description = 'Applies italic font style';
      break;
    case 'icon':
      description = 'Applies icon sizing';
      break;
    case 'tight':
      description = 'Reduces line height';
      break;
    default:
      description = 'Preset modifier';
  }

  return {
    contents: {
      kind: MarkupKind.Markdown,
      value: `**Preset Modifier**: \`${modifier}\`\n\n${description}`,
    },
  };
}

/**
 * Get hover for a direction modifier.
 */
function getDirectionHover(direction: string): Hover {
  return {
    contents: {
      kind: MarkupKind.Markdown,
      value: `**Direction Modifier**: \`${direction}\`\n\nApplies the style to the ${direction} side only.`,
    },
  };
}

/**
 * Get hover for a state alias.
 */
function getStateAliasHover(alias: string, config: MergedConfig): Hover {
  let content = `**State Alias**: \`${alias}\``;
  
  // Add description from config if available
  const description = config.stateDescriptions?.[alias];
  if (description) {
    content += `\n\n${description}`;
  }
  
  content += '\n\n*Defined in tasty.config.ts*\n\nUse in style mappings to apply styles conditionally.';
  
  return {
    contents: {
      kind: MarkupKind.Markdown,
      value: content,
    },
  };
}

/**
 * Get hover for a local state.
 */
function getLocalStateHover(state: string): Hover {
  return {
    contents: {
      kind: MarkupKind.Markdown,
      value: `**State Modifier**: \`${state}\`\n\n*Used in this file*\n\nApply via \`mods={{ ${state}: true }}\` or \`data-${state}\` attribute.`,
    },
  };
}
