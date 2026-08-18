// REACT CONCEPT: Imports
// We import React hooks and our custom components
import React, { useState, useEffect, useRef } from 'react';
import './App.css';

// REACT CONCEPT: Component Imports
// We import our custom components - this is component composition
import Header from './components/Header';
import ConnectionStatus from './components/ConnectionStatus';
import MessageList from './components/MessageList';
import MessageInput from './components/MessageInput';
import { semanticColors } from './theme/colors';

// REACT CONCEPT: TypeScript Interfaces
// Define the shape of our message data
interface Message {
  id: string;
  text: string;
  timestamp: Date;
  isFromServer: boolean;
}

// REACT CONCEPT: Main App Component
// This is the root component that manages the overall application state
function App() {
  // REACT CONCEPT: State Management with useState
  // Each useState call creates a piece of state and a function to update it
  const [statusMessage, setStatusMessage] = useState<string>('Connecting...');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  
  // REACT CONCEPT: useRef Hook
  // Refs let us access and persist values across renders without causing re-renders
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // REACT CONCEPT: Helper Functions
  // Functions to generate unique IDs and manage messages
  const generateId = () => Date.now().toString() + Math.random().toString(36).substr(2, 9);

  const addMessage = (text: string, isFromServer: boolean) => {
    const newMessage: Message = {
      id: generateId(),
      text,
      timestamp: new Date(),
      isFromServer
    };
    
    // REACT CONCEPT: State Updates with Previous State
    // When new state depends on previous state, use function form
    setMessages(prevMessages => [...prevMessages, newMessage]);
  };

  // REACT CONCEPT: WebSocket Connection Function
  const connectWebSocket = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    setStatusMessage('Connecting to server...');
    
    // Create new WebSocket connection
    const ws = new WebSocket('ws://localhost:8080/noodle');
    wsRef.current = ws;

    // REACT CONCEPT: Event Handlers
    ws.onopen = () => {
      setIsConnected(true);
      setStatusMessage('Connected to Ktor backend');
      addMessage('Connected to server!', true);
    };

    ws.onmessage = (event) => {
      console.log('Message from server:', event.data);
      addMessage(event.data, true);
    };

    ws.onclose = () => {
      setIsConnected(false);
      setStatusMessage('Connection closed');
      addMessage('Connection closed', true);
      
      // REACT CONCEPT: Automatic Reconnection
      // Try to reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connectWebSocket();
      }, 3000);
    };

    ws.onerror = () => {
      setIsConnected(false);
      setStatusMessage('Connection failed');
    };
  };

  // REACT CONCEPT: useEffect Hook
  // Effects let us perform side effects (like data fetching, subscriptions)
  useEffect(() => {
    // This runs once when component mounts
    connectWebSocket();

    // REACT CONCEPT: Cleanup Function
    // This runs when component unmounts
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []); // Empty dependency array means this effect runs once on mount

  // REACT CONCEPT: Event Handler Functions
  const handleSendMessage = (messageText: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      // Send message to server
      wsRef.current.send(messageText);
      
      // Add message to local state (for immediate UI feedback)
      addMessage(messageText, false);
    }
  };

  const handleReconnect = () => {
    connectWebSocket();
  };

  // REACT CONCEPT: JSX Return
  // This is what gets rendered to the DOM
  return (
    <div className="App">
      <div className="App-header" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        
        {/* REACT CONCEPT: Component Composition */}
        {/* We break our UI into smaller, reusable components */}
        
        <Header 
          title="Kora Web App" 
          subtitle="Learn React with real-time WebSocket communication"
        />
        
        {/* REACT CONCEPT: Props Passing */}
        {/* We pass data down to child components via props */}
        <ConnectionStatus 
          isConnected={isConnected}
          message={statusMessage}
          onReconnect={handleReconnect}
        />
        
        <MessageList messages={messages} />
        
        {/* REACT CONCEPT: Event Handler Props */}
        {/* We pass functions to child components to handle events */}
        <MessageInput 
          onSendMessage={handleSendMessage}
          disabled={!isConnected}
        />
        
        {/* REACT CONCEPT: Learning Resources */}
        <div style={{ 
          marginTop: '30px', 
          padding: '24px', 
          backgroundColor: semanticColors.background.primary,
          borderRadius: '12px',
          textAlign: 'left',
          border: `2px solid ${semanticColors.border.medium}`,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{
            color: semanticColors.text.primary,
            fontSize: '1.25rem',
            fontWeight: '600',
            marginBottom: '16px'
          }}>
            🎓 What you're learning in this app:
          </h3>
          <ul style={{ 
            textAlign: 'left', 
            marginLeft: '20px',
            color: semanticColors.text.primary,
            lineHeight: '1.6'
          }}>
            <li style={{ marginBottom: '8px' }}>
              <strong style={{ color: semanticColors.text.primary }}>Components:</strong> Reusable UI pieces (Header, ConnectionStatus, etc.)
            </li>
            <li style={{ marginBottom: '8px' }}>
              <strong style={{ color: semanticColors.text.primary }}>Props:</strong> Data passed from parent to child components
            </li>
            <li style={{ marginBottom: '8px' }}>
              <strong style={{ color: semanticColors.text.primary }}>State:</strong> Data that changes over time (connection status, messages)
            </li>
            <li style={{ marginBottom: '8px' }}>
              <strong style={{ color: semanticColors.text.primary }}>Hooks:</strong> useState (state), useEffect (side effects), useRef (persistent refs)
            </li>
            <li style={{ marginBottom: '8px' }}>
              <strong style={{ color: semanticColors.text.primary }}>Event Handling:</strong> Responding to user interactions
            </li>
            <li style={{ marginBottom: '8px' }}>
              <strong style={{ color: semanticColors.text.primary }}>Conditional Rendering:</strong> Showing/hiding elements based on conditions
            </li>
            <li style={{ marginBottom: '8px' }}>
              <strong style={{ color: semanticColors.text.primary }}>Lists:</strong> Rendering arrays of data with .map()
            </li>
            <li style={{ marginBottom: '8px' }}>
              <strong style={{ color: semanticColors.text.primary }}>Forms:</strong> Controlled inputs and form submission
            </li>
            <li style={{ marginBottom: '8px' }}>
              <strong style={{ color: semanticColors.text.primary }}>TypeScript:</strong> Type safety with interfaces and type annotations
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default App;
