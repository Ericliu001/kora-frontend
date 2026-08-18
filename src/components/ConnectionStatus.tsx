import React from 'react';
import { semanticColors } from '../theme/colors';

// REACT CONCEPT: Component Props
// This component receives data from its parent component

interface ConnectionStatusProps {
  isConnected: boolean;
  message: string;
  onReconnect?: () => void; // Optional function prop
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  isConnected, 
  message, 
  onReconnect 
}) => {
  // REACT CONCEPT: Conditional Styling
  // We change styles based on props with improved accessibility colors
  const statusStyle = {
    padding: '20px',
    border: `2px solid ${isConnected ? semanticColors.status.successBorder : semanticColors.status.errorBorder}`,
    borderRadius: '12px',
    margin: '20px 0',
    backgroundColor: isConnected ? semanticColors.status.successBg : semanticColors.status.errorBg,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' // Subtle shadow for depth
  };

  const iconStyle = {
    fontSize: '1.5em',
    marginRight: '10px',
    display: 'inline-flex',
    alignItems: 'center'
  };

  const buttonStyle = {
    padding: '10px 20px',
    backgroundColor: semanticColors.status.info,
    color: semanticColors.text.inverse,
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '0.9rem',
    transition: 'all 0.2s ease',
    // Focus state for accessibility
    outline: 'none'
  };

  const buttonHoverStyle = {
    ...buttonStyle,
    backgroundColor: semanticColors.status.infoBorder,
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)'
  };

  return (
    <div style={statusStyle}>
      <h3 style={{ 
        color: semanticColors.text.primary,
        fontSize: '1.25rem',
        fontWeight: '600',
        marginBottom: '12px'
      }}>
        Backend Connection Status
      </h3>
      
      {/* REACT CONCEPT: Conditional Rendering with Ternary Operator */}
      <div style={iconStyle}>
        <span style={{ 
          color: isConnected ? semanticColors.status.success : semanticColors.status.error,
          fontWeight: '600',
          fontSize: '1.1rem'
        }}>
          {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </span>
      </div>
      
      <p style={{ 
        color: semanticColors.text.primary,
        margin: '12px 0',
        fontSize: '1rem'
      }}>
        <strong>Status:</strong> {message}
      </p>
      
      {/* REACT CONCEPT: Conditional Rendering with && */}
      {/* Only show reconnect button if disconnected AND onReconnect function exists */}
      {!isConnected && onReconnect && (
        <button 
          onClick={onReconnect}
          style={buttonStyle}
          onMouseEnter={(e) => {
            Object.assign(e.currentTarget.style, buttonHoverStyle);
          }}
          onMouseLeave={(e) => {
            Object.assign(e.currentTarget.style, buttonStyle);
          }}
          onFocus={(e) => {
            e.currentTarget.style.boxShadow = `0 0 0 3px ${semanticColors.status.infoBg}`;
          }}
          onBlur={(e) => {
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          Try Reconnect
        </button>
      )}
    </div>
  );
};

export default ConnectionStatus;