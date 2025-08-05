import React from 'react';
import { tasty } from '@cube-dev/ui-kit';

// Test case 1: Simple styles object
const Button = tasty({
  styles: {
    padding: '2x',
    fill: '#primary'
  },
  as: 'button'
});

// Test case 2: This should have normal TSX highlighting
const normalVar = 'hello world';
const normalFunction = () => {
  return <div>Normal JSX</div>;
};

// Test case 3: Another styles object 
const Card = tasty({
  styles: {
    border: '1bw solid #border',
    radius: '1r'
  }
});

// Test case 4: This should also have normal highlighting
const anotherNormalVar = 'test';