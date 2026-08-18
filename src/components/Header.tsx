import React from 'react';
import { semanticColors } from '../theme/colors';

// REACT CONCEPT: Function Components
// This is a simple function component that receives props
// Props are like arguments passed to a function - they make components reusable

interface HeaderProps {
  title: string;
  subtitle?: string; // Optional prop (notice the ?)
}

// REACT CONCEPT: TypeScript Props Interface
// We define what props this component expects
// This gives us type safety and better IDE support

const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
  // REACT CONCEPT: Destructuring Props
  // Instead of props.title and props.subtitle, we destructure them
  
  return (
    <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
      <h1 style={{ 
        color: semanticColors.text.primary,
        fontSize: '2.5rem',
        fontWeight: '700',
        marginBottom: '0.5rem'
      }}>
        {title}
      </h1>
      {/* REACT CONCEPT: Conditional Rendering */}
      {/* Only show subtitle if it exists */}
      {/* ACCESSIBILITY: Using high contrast color instead of #666 */}
      {subtitle && (
        <p style={{ 
          color: semanticColors.text.secondary, // Much better contrast than #666
          fontSize: '1.1rem',
          fontWeight: '400',
          margin: '0'
        }}>
          {subtitle}
        </p>
      )}
    </header>
  );
};

export default Header;