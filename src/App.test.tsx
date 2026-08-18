import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the small-talk practice landing page', () => {
  render(<App />);
  expect(screen.getByText(/find your flow in conversation/i)).toBeInTheDocument();
});
