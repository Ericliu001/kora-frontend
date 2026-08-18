import React from 'react';
import { semanticColors } from '../theme/colors';

// REACT CONCEPT: TypeScript Interfaces
// Define the shape of our data
interface Message {
  id: string;
  text: string;
  timestamp: Date;
  isFromServer: boolean;
}

interface MessageListProps {
  messages: Message[];
}

// REACT CONCEPT: Rendering Lists
// This component shows how to render arrays of data
const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  
  // REACT CONCEPT: Early Return / Guard Clause
  // Handle empty state gracefully with improved contrast
  if (messages.length === 0) {
    return (
      <div style={{ 
        padding: '30px', 
        textAlign: 'center', 
        color: semanticColors.text.secondary, // Better contrast than #666
        fontStyle: 'italic',
        backgroundColor: semanticColors.background.secondary,
        borderRadius: '12px',
        border: `2px solid ${semanticColors.border.light}`,
        margin: '20px 0'
      }}>
        <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>💬</div>
        <div style={{ fontSize: '1.1rem', fontWeight: '500' }}>
          No messages yet
        </div>
        <div style={{ fontSize: '0.9rem', marginTop: '4px' }}>
          Send a message to get started!
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      maxHeight: '400px', 
      overflowY: 'auto', 
      border: `2px solid ${semanticColors.border.medium}`,
      borderRadius: '12px',
      padding: '16px',
      backgroundColor: semanticColors.background.primary,
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
    }}>
      <h3 style={{
        color: semanticColors.text.primary,
        fontSize: '1.25rem',
        fontWeight: '600',
        marginBottom: '16px'
      }}>
        Messages
      </h3>
      
      {/* REACT CONCEPT: Array.map() for Rendering Lists */}
      {/* Each item needs a unique 'key' prop for React's virtual DOM */}
      {messages.map((message) => (
        <div
          key={message.id} // IMPORTANT: Always provide a unique key
          style={{
            padding: '16px',
            margin: '8px 0',
            borderRadius: '10px',
            backgroundColor: message.isFromServer ? semanticColors.status.infoBg : '#f3e8ff',
            borderLeft: `4px solid ${message.isFromServer ? semanticColors.status.info : '#8b5cf6'}`,
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            transition: 'transform 0.1s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          {/* REACT CONCEPT: Conditional Styling in JSX */}
          <div style={{ 
            fontWeight: '600', 
            color: message.isFromServer ? semanticColors.status.info : '#7c3aed',
            fontSize: '0.95rem',
            marginBottom: '8px'
          }}>
            {message.isFromServer ? '🤖 Server' : '👤 You'}
          </div>
          
          <div style={{ 
            margin: '8px 0',
            color: semanticColors.text.primary,
            fontSize: '1rem',
            lineHeight: '1.5'
          }}>
            {message.text}
          </div>
          
          {/* REACT CONCEPT: Date Formatting */}
          {/* ACCESSIBILITY: Better contrast for timestamp */}
          <div style={{ 
            fontSize: '0.85rem', 
            color: semanticColors.text.muted, // Better contrast than #666
            textAlign: 'right',
            fontWeight: '500'
          }}>
            {message.timestamp.toLocaleTimeString()}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MessageList;