import React, { useState } from 'react';
import { semanticColors } from '../theme/colors';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

// REACT CONCEPT: Forms and Controlled Components
// This component demonstrates form handling and local state with improved accessibility
const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, disabled = false }) => {
  // REACT CONCEPT: useState Hook
  // This creates local state for our component
  // useState returns [currentValue, setterFunction]
  const [inputValue, setInputValue] = useState<string>('');
  const [isFocused, setIsFocused] = useState<boolean>(false);
  
  // REACT CONCEPT: Event Handlers
  // Functions that respond to user interactions
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    // REACT CONCEPT: Preventing Default Browser Behavior
    e.preventDefault(); // Prevents page reload on form submit
    
    // REACT CONCEPT: Input Validation
    // Trim whitespace and check if message is not empty
    const trimmedMessage = inputValue.trim();
    if (trimmedMessage && !disabled) {
      // REACT CONCEPT: Lifting State Up
      // We call the parent's function to handle the message
      onSendMessage(trimmedMessage);
      
      // REACT CONCEPT: Resetting Form State
      setInputValue(''); // Clear the input after sending
    }
  };

  // REACT CONCEPT: Controlled Input
  // The input's value is controlled by React state
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  // REACT CONCEPT: Keyboard Event Handling
  // Allow sending message with Enter key (but not Shift+Enter)
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any); // Type casting for the event
    }
  };

  // REACT CONCEPT: Dynamic Styling Based on State
  const isSubmitDisabled = disabled || !inputValue.trim();
  
  const inputStyle = {
    flex: 1,
    padding: '12px 16px',
    borderRadius: '8px',
    border: `2px solid ${
      disabled 
        ? semanticColors.border.light 
        : isFocused 
          ? semanticColors.status.info
          : semanticColors.border.medium
    }`,
    fontSize: '16px',
    backgroundColor: disabled ? semanticColors.background.secondary : semanticColors.background.primary,
    color: disabled ? semanticColors.text.muted : semanticColors.text.primary,
    outline: 'none',
    transition: 'all 0.2s ease',
    boxShadow: isFocused ? `0 0 0 3px ${semanticColors.status.infoBg}` : 'none'
  };

  const buttonStyle = {
    padding: '12px 24px',
    backgroundColor: isSubmitDisabled ? semanticColors.disabled : semanticColors.status.info,
    color: semanticColors.text.inverse,
    border: 'none',
    borderRadius: '8px',
    cursor: isSubmitDisabled ? 'not-allowed' : 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    outline: 'none',
    minWidth: '80px'
  };

  const buttonHoverStyle = {
    ...buttonStyle,
    backgroundColor: isSubmitDisabled ? semanticColors.disabled : semanticColors.status.infoBorder,
    transform: isSubmitDisabled ? 'none' : 'translateY(-1px)',
    boxShadow: isSubmitDisabled ? 'none' : '0 4px 8px rgba(0, 0, 0, 0.15)'
  };

  return (
    <div style={{ 
      marginTop: '20px',
      padding: '20px',
      backgroundColor: semanticColors.background.secondary,
      borderRadius: '12px',
      border: `1px solid ${semanticColors.border.light}`
    }}>
      <h3 style={{
        color: semanticColors.text.primary,
        fontSize: '1.25rem',
        fontWeight: '600',
        marginBottom: '16px'
      }}>
        Send a Message
      </h3>
      
      {/* REACT CONCEPT: Form Handling */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '12px' }}>
        
        {/* REACT CONCEPT: Controlled Input Component with Enhanced Accessibility */}
        <input
          type="text"
          value={inputValue} // Controlled by state
          onChange={handleInputChange} // Updates state on every keystroke
          onKeyPress={handleKeyPress}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={disabled ? "Disconnected..." : "Type your message here..."}
          disabled={disabled}
          style={inputStyle}
          aria-label="Message input"
          aria-describedby="input-help"
        />
        
        {/* REACT CONCEPT: Dynamic Button States with Enhanced Styling */}
        <button
          type="submit"
          disabled={isSubmitDisabled}
          style={buttonStyle}
          onMouseEnter={(e) => {
            if (!isSubmitDisabled) {
              Object.assign(e.currentTarget.style, buttonHoverStyle);
            }
          }}
          onMouseLeave={(e) => {
            Object.assign(e.currentTarget.style, buttonStyle);
          }}
          onFocus={(e) => {
            if (!isSubmitDisabled) {
              e.currentTarget.style.boxShadow = `0 0 0 3px ${semanticColors.status.infoBg}`;
            }
          }}
          onBlur={(e) => {
            e.currentTarget.style.boxShadow = 'none';
          }}
          aria-label="Send message"
        >
          Send
        </button>
      </form>
      
      {/* REACT CONCEPT: Helpful UI Messages with Better Contrast */}
      <div 
        id="input-help"
        style={{ 
          fontSize: '0.85rem', 
          color: semanticColors.text.muted, // Better contrast than #666
          marginTop: '8px',
          fontStyle: 'italic'
        }}
      >
        💡 Press Enter to send, or click the Send button
      </div>
    </div>
  );
};

export default MessageInput;