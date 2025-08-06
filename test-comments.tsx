import { tasty } from '@cube-dev/ui-kit';

// Test comments in Tasty sections
const TestComponent = tasty({
  styles: {
    // This is a line comment - should be highlighted as comment
    padding: '4x',
    
    /* This is a block comment
       spanning multiple lines
       should also be highlighted */
    fill: '#surface',
    
    // Custom properties with comments
    '$theme-spacing': '2x', // inline comment
    '$custom-color': '#primary', /* inline block comment */
    
    // Nested objects with comments
    Title: {
      // Comment inside nested object
      preset: 'h3',
      /* Block comment */ color: '#primary',
      margin: '0 0 2x 0', // Another inline comment
    },
  },
  
  // Comments in variants section
  variants: {
    // Default variant
    default: {
      fill: '#surface', // Surface background
      /* Multi-line comment
         for padding */ 
      padding: '4x',
    },
    // Danger variant
    danger: {
      fill: '#danger.10', // Light danger background
      border: '1bw solid #danger', /* Danger border */
    },
  },
});

// Test in JSX attributes too
const JSXTest = () => (
  <div
    containerStyles={{
      // Comments should work here too
      padding: '4x',
      /* Block comment in JSX */
      fill: '#surface',
      // Custom properties
      '$size': '2x', // with inline comment
    }}
  >
    Test content
  </div>
);

export { TestComponent, JSXTest };