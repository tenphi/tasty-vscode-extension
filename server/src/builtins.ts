/**
 * Built-in tasty properties, units, and other constants.
 * These are always available regardless of config file.
 */

/**
 * All built-in style properties from StylesInterface.
 * Organized by category.
 */
export const STYLE_PROPERTIES = {
  // Layout
  layout: [
    'display',
    'flow',
    'gap',
    'padding',
    'paddingInline',
    'paddingBlock',
    'margin',
    'width',
    'height',
    'flexBasis',
    'flexGrow',
    'flexShrink',
    'flex',
  ],

  // Visual
  visual: [
    'fill',
    'color',
    'border',
    'radius',
    'shadow',
    'outline',
    'outlineOffset',
    'fade',
    'image',
    'opacity',
  ],

  // Typography
  typography: [
    'preset',
    'font',
    'textAlign',
    'textTransform',
    'fontWeight',
    'fontStyle',
    'whiteSpace',
    'textDecoration',
    'textOverflow',
    'wordBreak',
    'letterSpacing',
    'lineHeight',
  ],

  // Grid
  grid: [
    'gridColumns',
    'gridRows',
    'gridTemplate',
    'gridAreas',
    'gridColumn',
    'gridRow',
    'gridArea',
  ],

  // Alignment
  alignment: [
    'align',
    'justify',
    'place',
    'placeContent',
    'placeItems',
    'alignItems',
    'alignContent',
    'justifyItems',
    'justifyContent',
    'placeSelf',
    'alignSelf',
    'justifySelf',
  ],

  // Position
  position: ['position', 'inset', 'top', 'right', 'bottom', 'left', 'zIndex', 'order'],

  // Other
  other: [
    'overflow',
    'scrollbar',
    'transition',
    'animation',
    'hide',
    'reset',
    'cursor',
    'pointerEvents',
    'userSelect',
    'visibility',
    'transform',
    'transformOrigin',
    'filter',
    'backdropFilter',
    'mixBlendMode',
    'isolation',
    'content',
    'listStyle',
    'appearance',
    'resize',
    'objectFit',
    'objectPosition',
    'aspectRatio',
    'boxSizing',
    'container',
    'containerName',
    'containerType',
    'clip',
    'clipPath',
    'mask',
    'maskImage',
    'willChange',
    'touchAction',
    'scrollBehavior',
    'scrollSnapType',
    'scrollSnapAlign',
    'caretColor',
    'accentColor',
  ],

  // Special
  special: ['@keyframes', '@properties', '$'],
};

/**
 * All style properties as a flat array.
 */
export const ALL_STYLE_PROPERTIES = Object.values(STYLE_PROPERTIES).flat();

/**
 * Built-in units that are always available.
 */
export const BUILT_IN_UNITS = ['x', 'r', 'cr', 'bw', 'ow', 'fs', 'lh', 'sf'];

/**
 * CSS units recognized by tasty.
 */
export const CSS_UNITS = [
  'px',
  'em',
  'rem',
  '%',
  'vw',
  'vh',
  'vmin',
  'vmax',
  'dvw',
  'dvh',
  'svw',
  'svh',
  'lvw',
  'lvh',
  'ch',
  'ex',
  'cap',
  'ic',
  'lh',
  'rlh',
  'cqw',
  'cqh',
  'cqi',
  'cqb',
  'cqmin',
  'cqmax',
  'deg',
  'rad',
  'grad',
  'turn',
  's',
  'ms',
  'fr',
];

/**
 * Built-in preset modifiers.
 */
export const PRESET_MODIFIERS = ['strong', 'italic', 'icon', 'tight'];

/**
 * Direction modifiers for border, padding, margin, etc.
 */
export const DIRECTION_MODIFIERS = [
  'top',
  'right',
  'bottom',
  'left',
  'inline',
  'block',
  'inline-start',
  'inline-end',
  'block-start',
  'block-end',
];

/**
 * Built-in CSS functions.
 */
export const CSS_FUNCTIONS = [
  // Math
  'calc',
  'min',
  'max',
  'clamp',
  'abs',
  'sign',
  'round',
  'mod',
  'rem',
  'sin',
  'cos',
  'tan',
  'asin',
  'acos',
  'atan',
  'atan2',
  'pow',
  'sqrt',
  'hypot',
  'log',
  'exp',

  // Color
  'rgb',
  'rgba',
  'hsl',
  'hsla',
  'hwb',
  'lab',
  'lch',
  'oklch',
  'oklab',
  'okhsl',
  'color',
  'color-mix',
  'light-dark',

  // Gradients
  'linear-gradient',
  'radial-gradient',
  'conic-gradient',
  'repeating-linear-gradient',
  'repeating-radial-gradient',
  'repeating-conic-gradient',

  // Transform
  'translate',
  'translateX',
  'translateY',
  'translateZ',
  'translate3d',
  'rotate',
  'rotateX',
  'rotateY',
  'rotateZ',
  'rotate3d',
  'scale',
  'scaleX',
  'scaleY',
  'scaleZ',
  'scale3d',
  'skew',
  'skewX',
  'skewY',
  'matrix',
  'matrix3d',
  'perspective',

  // Filter
  'blur',
  'brightness',
  'contrast',
  'drop-shadow',
  'grayscale',
  'hue-rotate',
  'invert',
  'opacity',
  'saturate',
  'sepia',

  // Other
  'url',
  'var',
  'env',
  'attr',
  'counter',
  'counters',
  'image',
  'image-set',
  'cross-fade',
  'element',
  'paint',
  'path',
  'polygon',
  'circle',
  'ellipse',
  'inset',
  'rect',
  'xywh',
  'fit-content',
  'minmax',
  'repeat',
];

/**
 * Common pseudo-classes.
 */
export const PSEUDO_CLASSES = [
  'hover',
  'focus',
  'focus-visible',
  'focus-within',
  'active',
  'visited',
  'target',
  'first-child',
  'last-child',
  'first-of-type',
  'last-of-type',
  'only-child',
  'only-of-type',
  'nth-child',
  'nth-last-child',
  'nth-of-type',
  'nth-last-of-type',
  'empty',
  'enabled',
  'disabled',
  'checked',
  'indeterminate',
  'default',
  'valid',
  'invalid',
  'in-range',
  'out-of-range',
  'required',
  'optional',
  'read-only',
  'read-write',
  'placeholder-shown',
  'autofill',
  'root',
  'host',
  'host-context',
  'is',
  'where',
  'not',
  'has',
  'dir',
  'lang',
  'any-link',
  'link',
  'local-link',
  'scope',
  'current',
  'past',
  'future',
  'playing',
  'paused',
  'seeking',
  'buffering',
  'stalled',
  'muted',
  'volume-locked',
  'fullscreen',
  'picture-in-picture',
  'modal',
  'user-valid',
  'user-invalid',
  'defined',
  'popover-open',
  'open',
  'closed',
  'state',
];

/**
 * Common pseudo-elements.
 */
export const PSEUDO_ELEMENTS = [
  'before',
  'after',
  'first-line',
  'first-letter',
  'selection',
  'placeholder',
  'marker',
  'backdrop',
  'file-selector-button',
  'cue',
  'cue-region',
  'part',
  'slotted',
];

/**
 * CSS global values that are valid for any CSS property.
 * These should never trigger "unknown" warnings.
 */
export const CSS_GLOBAL_VALUES = [
  'inherit',
  'initial',
  'unset',
  'revert',
  'revert-layer',
];

/**
 * Reserved color tokens that are always valid.
 * These should never trigger "unknown token" warnings.
 * 
 * - #current: Maps to CSS `currentcolor`, supports opacity like `#current.5`
 */
export const RESERVED_COLOR_TOKENS = ['#current'];

/**
 * Get description for a built-in unit.
 */
export function getUnitDescription(unit: string): string {
  switch (unit) {
    case 'x':
      return 'gap multiplier (e.g., 2x = 2 × $gap)';
    case 'r':
      return 'radius unit (e.g., 1r = $radius)';
    case 'cr':
      return 'card radius (e.g., 1cr = $card-radius)';
    case 'bw':
      return 'border width (e.g., 1bw = $border-width)';
    case 'ow':
      return 'outline width (e.g., 1ow = $outline-width)';
    case 'fs':
      return 'font size';
    case 'lh':
      return 'line height';
    case 'sf':
      return 'stable fraction (grid layout)';
    default:
      return 'custom unit';
  }
}
