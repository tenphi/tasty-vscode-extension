import React from 'react';
import { tasty } from '@cube-dev/ui-kit';

// Test file specifically for user-reported highlighting issues

const TestComponent = tasty({
  styles: {
    // 1. Bracket highlighting consistency test
    radius: '(1cr + 1bw)',          // Should have consistent bracket highlighting
    popover: 'initial max-content (50vh - 4x)', // Should have consistent bracket highlighting
    
    // 2. Non-string values highlighting test  
    margin: 0,                      // Should be highlighted as numeric
    border: true,                   // Should be highlighted as boolean
    hide: false,                    // Should be highlighted as boolean
    opacity: 1,                     // Should be highlighted as numeric
    zIndex: 10,                     // Should be highlighted as numeric
    scale: 1.5,                     // Should be highlighted as numeric decimal
    
    // 3. Custom properties highlighting test  
    // Quoted custom property definitions (like in user's image)
    '$local-spacing': '2x',         // Quoted definition - should be highlighted as custom property
    '$theme-color': '#primary',     // Quoted definition - should be highlighted as custom property  
    '$size-lg': '4x',               // Quoted definition - should be highlighted as custom property
    
    // Unquoted custom property definitions
    $unquoted: '1x',                // Unquoted definition - should be highlighted as custom property
    
    // Usage of custom properties
    padding: '$local-spacing',      // Usage - should be highlighted as custom property
    color: '$theme-color',          // Usage - should be highlighted as custom property
    gap: '$size-lg',                // Usage - should be highlighted as custom property
    
    // Mixed expressions with custom properties
    width: 'calc($size-lg * 2)',    // Custom property in calc function
  },
});

// Test in JSX attributes too
const JSXTest = () => (
  <div
    containerStyles={{
      // All the same patterns should work in JSX attributes
      radius: '(1cr + 1bw)',
      margin: 0,
      border: true,
      '$custom-var': '1x',
      padding: '$custom-var',
    }}
  >
    Test content
  </div>
);

export { TestComponent, JSXTest };