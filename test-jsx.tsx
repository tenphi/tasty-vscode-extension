import React from 'react';

// Test JSX attribute styles - these should be highlighted
const JSXExample = () => (
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
    />
    
    <button
      buttonStyles={{
        fill: {
          '': '#primary',
          'hovered': '#primary.8',
          '[disabled]': '#gray'
        },
        color: '#white',
        radius: '1r'
      }}
    >
      Click me
    </button>
    
    <div
      containerStyles={{
        padding: '4x',
        fill: '#surface'
      }}
    >
      Content
    </div>
  </div>
);

// This should still work (normal tasty component)
const TastyComponent = tasty({
  styles: {
    padding: '2x',
    fill: '#primary'
  }
});

export default JSXExample;