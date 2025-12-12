import React from 'react';
import { tasty } from '@cube-dev/ui-kit';

// Test Tasty syntax highlighting with realistic examples

// Variable declarations ending with 'styles' - NEW FEATURE
const INPUT_STYLES = {
  border: '1bw solid #border',
  radius: '1r',
  padding: '2x',
  fill: {
    '': '#white',
    '[disabled]': '#gray.05',
    'focused': '#primary.05'
  },
  color: '#text',
  preset: 't3'
};

let buttonStyles = {
  fill: '#primary',
  color: '#white',
  padding: '2x 4x',
  radius: '1r',
  border: 'none',
  preset: 't3',
  transition: 'fill 0.2s'
};

var cardStyles = {
  fill: '#surface',
  padding: '4x',
  radius: '2r',
  border: '1bw solid #border',
  transition: 'theme 0.3s'
};

const HEADER_STYLES = {
  fill: '#primary',
  color: '#white',
  padding: '3x 4x',
  preset: 'h2',
  align: 'center'
};

const styles = {
  display: 'flex',
  gap: '2x',
  padding: '4x',
  flow: 'column'
};

// Plain objects (NOT highlighted as Tasty syntax)
const plainObject = {
  asd: '123',
  test: '1s asdf #primary',
  someKey: 'regular value'
};

const config = {
  apiUrl: 'https://api.example.com',
  timeout: 5000,
  theme: 'dark'
};

// 1. Basic Tasty component using real syntax
const Card = tasty({
  as: 'div',
  styles: {
    padding: '4x',
    fill: '#surface',
    border: true,
    radius: true,
  },
  styleProps: ['padding', 'fill'],
});

// 2. Interactive button with state logic
const Button = tasty({
  as: 'button',
  styles: {
    padding: '2x 4x',
    radius: '1r',
    border: 'none',
    preset: 't3',
    transition: 'fill 0.2s',
    // Inline comment inside tasty styles should NOT leak highlighting
    fill: {
      '': '#primary',
      'hovered': '#primary.8',
      'pressed': '#primary.6',
      '[disabled]': '#gray',
    },
    color: {
      '': '#white',
      '[disabled]': '#gray.60',
      ':focus-visible': '#primary',
    },
  },
});

// 3. Responsive container with arrays
const Container = tasty({
  styles: {
    padding: ['6x', '4x', '2x'],
    width: ['max 1200px', 'max 800px', 'max 100%'],
    margin: '0 auto',
    gap: '2x',
    display: 'flex',
    flow: 'column',
  },
});

// 4. Card with sub-elements and variants
const InfoCard = tasty({
  styles: {
    padding: '4x',
    fill: '#surface',
    border: '1bw solid #border',
    radius: '2r',
    transition: 'theme 0.3s',
    
    // Sub-element styling
    Title: {
      preset: 'h3',
      color: '#primary',
      margin: '0 0 2x 0',
    },
    Content: {
      color: '#text',
      preset: 'p1',
    },
    Footer: {
      padding: '2x top',
      border: '1bw solid #border top',
      color: '#text.60',
    },
  },
  // Variants should be highlighted with tasty syntax
  variants: {
    default: {
      fill: '#surface',
      padding: '4x',
      radius: '2r',
    },
    danger: {
      fill: '#danger.10',
      border: '1bw solid #danger',
      color: '#danger',
    },
    success: {
      fill: '#success.10',
      border: '1bw solid #success',
      color: '#success.80',
    },
  },
});

// 5. Flexible container with styleProps
const FlexContainer = tasty({
  as: 'div',
  styles: {
    display: 'flex',
    padding: '2x',
  },
  styleProps: ['gap', 'align', 'justify', 'fill', 'flow'],
});

// 6. Real usage patterns in JSX with object styles
const FormExample = () => (
  <div>
    <input
      inputStyles={{
        border: '1bw solid #border',
        radius: '1r',
        padding: '2x',
        fill: '#white',
        color: '#text'
      }}
      type="text"
      placeholder="Enter text..."
    />
    {/* Predefined styles via identifier should be ignored */}
    <input styles={styles} />
    <FlexContainer
      gap="2x"
      align="center"
      justify="space-between"
      fill="#surface"
    >
      <button
        buttonStyles={{
          fill: '#primary',
          color: '#white',
          padding: '2x 4x',
          radius: '1r',
          border: 'none',
          preset: 't3'
        }}
        onClick={() => {}}
      >
        Submit
      </button>
      {/* Attribute referencing identifier should be ignored */}
      <button buttonStyles={buttonStyles}>Secondary</button>
      <button
        secondaryStyles={{
          fill: 'transparent',
          color: '#text',
          padding: '2x 4x',
          radius: '1r',
          border: '1bw solid #border'
        }}
        onClick={() => {}}
      >
        Cancel
      </button>
    </FlexContainer>
    <div
      cardStyles={{
        fill: '#surface',
        padding: '4x',
        radius: '2r',
        border: '1bw solid #border'
      }}
    >
      <h3
        titleStyles={{
          color: '#primary',
          preset: 'h4',
          margin: '0 0 2x 0'
        }}
      >
        Card Title
      </h3>
      <p
        textStyles={{
          color: '#text',
          preset: 'p1',
          margin: '0'
        }}
      >
        Card content with proper Tasty styling
      </p>
    </div>
  </div>
);

// 7. Complex state logic in JSX styles
const InteractiveExample = () => (
  <div>
    <button
      buttonStyles={{
        fill: {
          '': '#primary',
          'hovered': '#primary.8',
          'pressed': '#primary.6',
          '[disabled]': '#gray'
        },
        color: {
          '': '#white',
          '[disabled]': '#gray.60'
        },
        padding: '2x 4x',
        radius: '1r',
        border: 'none',
        transition: 'fill 0.2s'
      }}
    >
      Interactive Button
    </button>

    <div
      containerStyles={{
        fill: {
          '': '#surface',
          'hovered': '#surface.hover',
          'loading | processing': '#gray.05',
          '(active & !disabled) | selected': '#primary.10'
        },
        border: {
          '': '1bw solid #border',
          'focused': '2bw solid #primary',
          '[data-variant="danger"]': '1bw solid #danger'
        },
        padding: '4x',
        radius: '2r'
      }}
      styles={styles}
    >
      <span
        textStyles={{
          color: {
            '': '#text',
            ':hover': '#primary',
            '[data-theme="dark"]': '#text.dark',
            'highlighted & .special': '#accent'
          },
          preset: 'h4'
        }}
      >
        Dynamic Content
      </span>
    </div>
  </div>
);

// 8. Advanced features showcase
const AdvancedComponent = tasty({
  styles: {
    // Custom properties
    '$local-spacing': '2x',
    '$theme-color': '#primary',
    '$size-lg': '4x',
    
    // Layout using new syntax with defaults
    display: 'grid',
    gap: '($local-spacing, 1x)',      // Custom property with fallback
    padding: '($theme-color, #gray)', // Custom property with color fallback
    margin: '($size-lg, 3x)',         // Custom property with size fallback
    
    // Test examples from user feedback
    radius: '(1cr + 1bw)',
    hide: false,
    opacity: 1.5,
    
    // Complex state-based styling
    fill: {
      '': '#surface',
      'hovered': '#primary.05',
      'loading | processing': '#gray.05',
      '(active & !disabled) | selected': '#primary.10',
      '[data-loading="true"]': '#gray.10',
      '[aria-selected="true"]': '#blue.05',
      ':nth-of-type(odd)': '#surface',
    },
    
    color: {
      '': '#text',
      ':hover': '#primary',
      ':focus-visible': '#primary',
      '[data-theme="dark"]': '#text',
      '.highlighted': '#primary',
      'focused & .interactive': '#primary.8',
    },
    
    border: {
      '': '1bw solid #border',
      'hovered': '1bw solid #primary.40',
      '[data-size="large"] & focused': '2bw solid #primary',
      ':focus-visible': '2bw solid #primary',
    },
    
    // Responsive dimensions
    width: 'min 200px max 800px',
    height: 'min 100px',
    
    // Advanced features
    fade: '2x left right',
    scrollbar: 'thin #primary.40 #surface',
    preset: 'h2',
    align: 'center',
    transition: 'theme 0.3s',
  },
});

// 9. New Custom Properties Syntax Showcase
const CustomPropertiesShowcase = tasty({
  styles: {
    // Custom property definitions
    '$primary-spacing': '4x',
    '$secondary-color': '#blue',
    '$border-radius': '1r',
    '$animation-duration': '0.3s',
    
    // NEW SYNTAX: Custom properties with default values
    padding: '($primary-spacing, 2x)',           // Falls back to 2x if $primary-spacing not defined
    fill: '($secondary-color, #gray)',           // Falls back to #gray if $secondary-color not defined  
    radius: '($border-radius, 0.5r)',           // Falls back to 0.5r if $border-radius not defined
    transition: 'all ($animation-duration, 0.2s)', // Falls back to 0.2s if $animation-duration not defined
    
    // Complex expressions with custom properties and defaults
    margin: 'calc(($primary-spacing, 1x) * 2)', // Mathematical expressions with fallbacks
    border: '1bw solid ($secondary-color, #border)', // Border with color fallback
    gap: '($primary-spacing, 1x) ($primary-spacing, 1x)', // Multiple instances in one value
    
    // Mixed usage - some with defaults, some without
    width: '($container-width, 100%)',           // With default
    height: '$fixed-height',                     // Without default (old syntax still works)
  },
});

// 10. Test specific user feedback examples  
const PopoverComponent = tasty({
  styles: {
    // This should have consistent bracket highlighting
    radius: '(1cr + 1bw)',
    popover: 'initial max-content (50vh - 4x)',
    // Regression: comment in the middle of a property value block
    // should end at EOL and not leak until file end
    
    // Non-string values should be highlighted
    margin: 0,
    hide: false,
    opacity: 1,
    zIndex: 10,
    
    // Custom properties - EXACTLY like in user's image
    '$local-spacing': '2x',          // QUOTED custom property definition - should be highlighted
    '$theme-color': '#primary',      // QUOTED custom property definition - should be highlighted  
    '$size-lg': '4x',               // QUOTED custom property definition - should be highlighted
    
    // Layout using custom properties with NEW SYNTAX
    display: 'grid',
    gap: '($local-spacing, 2x)',          // Custom property with default value - should be highlighted
    padding: '($local-spacing, 2x)',      // Custom property with default value - should be highlighted
  },
});

// 11. Complex state logic examples
const StateLogicShowcase = tasty({
  styles: {
    fill: {
      '': '#surface',
      '!disabled & hovered': '#primary.05',               // NOT disabled AND hovered
      'success | complete': '#success.10',                // success OR complete  
      'warning ^ error': '#warning.10',                   // warning XOR error
      '(pressed & !disabled) | selected': '#primary.20', // Grouped logic
      '!(error | warning) & validated': '#success.05',   // NOT (error OR warning) AND validated
    },
    color: {
      '': '#text',
      ':hover': '#primary',
      ':focus-visible': '#primary',
      '[data-variant="danger"]': '#danger',
      '.special-item': '#accent',
      'active & .priority': '#primary.8',
      '!readonly & (:hover | :focus)': '#interactive',
    },
  },
});

// 12. NEW SIMPLIFIED SYNTAX: Simplified attribute selector showcase
const SimplifiedSyntaxShowcase = tasty({
  styles: {
    // Simplified syntax in object property keys - all three quote styles
    'theme=danger': {
      fill: '#danger.10',
      color: '#danger',
      border: '1bw solid #danger',
    },
    'theme="success"': {
      fill: '#success.10',
      color: '#success',
      border: '1bw solid #success',
    },
    "theme='warning'": {
      fill: '#warning.10',
      color: '#warning',
      border: '1bw solid #warning',
    },
    
    // More complex examples with multiple attributes
    'variant=primary': {
      fill: '#primary',
      color: '#white',
    },
    '(:has(> Icon) | :has(> Prefix)) & (:has(> RightIcon) | :has(> Suffix) | :has(> Actions))': {
      gap: '2x',
      align: 'center',
    },
    'size="large"': {
      padding: '4x 6x',
      preset: 'h2',
    },
    "mode='dark'": {
      fill: '#dark',
      color: '#white',
    },
    
    // Simplified syntax mixed with other state expressions
    fill: {
      '': '#surface',
      'hovered': '#primary.05',
      'theme=danger': '#danger.10',           // Simplified syntax in value
      'theme="success"': '#success.10',       // Simplified syntax with double quotes
      "theme='warning'": '#warning.10',       // Simplified syntax with single quotes
      'variant=primary & hovered': '#primary.20',  // Combined with state logic
      'size="large" | variant="xl"': '#gray.05',   // Combined with OR logic
    },
    
    color: {
      '': '#text',
      'theme=danger': '#danger',
      'theme="success"': '#success',
      "variant='secondary'": '#secondary',
    },
    
    border: {
      '': '1bw solid #border',
      'theme=danger': '2bw solid #danger',
      'theme="success"': '2bw solid #success',
    },
  },
});

export { 
  Card, 
  Button, 
  Container, 
  InfoCard, 
  FlexContainer, 
  FormExample, 
  InteractiveExample,
  AdvancedComponent,
  CustomPropertiesShowcase,
  PopoverComponent,
  StateLogicShowcase,
  SimplifiedSyntaxShowcase,
  // Export the style variables for external use
  INPUT_STYLES,
  buttonStyles,
  cardStyles,
  HEADER_STYLES,
  styles
};

// User-reported leakage case: ensure highlighting stops after closing brace
const TOKENS = { primary: '#primary' };
const DEFAULT_STYLES = {
  display: 'block',
  preset: 't3',
  ...Object.keys(TOKENS).reduce((map, key) => {
    map[`$${key}`] = TOKENS[key];

    return map;
  }, {}),
};
const STYLES = [...BASE_STYLES, ...BLOCK_STYLES];