import React, { useState, useEffect, useRef } from 'react';
import './UserDashboard.css';

interface ChatMessage {
  id: string;
  type: 'user' | 'screenshot' | 'llm_response' | 'system';
  content: string;
  extractedText?: string;
  timestamp: Date;
}

export const UserDashboard = ({ session, onLogout }: { session: any; onLogout: () => void }) => {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [screenshotLoading, setScreenshotLoading] = useState(false);
  const [llmLoading, setLlmLoading] = useState(false);
  const [currentScreenshot, setCurrentScreenshot] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [timer, setTimer] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isWorking) {
      interval = setInterval(() => setTimer(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isWorking]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        const history = await window.api.getChatHistory(session.token);
        if (history && Array.isArray(history)) {
          const formattedMessages: ChatMessage[] = [];
          for (const msg of history) {
            if (msg.message_type === 'screenshot') {
              formattedMessages.push({
                id: msg.id + '_screenshot',
                type: 'screenshot',
                content: 'Screenshot taken and text extracted',
                extractedText: msg.extracted_text,
                timestamp: new Date(msg.created_at)
              });
            } else if (msg.message_type === 'llm_response') {
              formattedMessages.push({
                id: msg.id + '_user',
                type: 'user',
                content: msg.extracted_text || '',
                timestamp: new Date(msg.created_at)
              });
              formattedMessages.push({
                id: msg.id + '_llm',
                type: 'llm_response',
                content: msg.llm_response || msg.content,
                timestamp: new Date(msg.created_at)
              });
            } else {
              formattedMessages.push({
                id: msg.id,
                type: msg.message_type as any,
                content: msg.content,
                timestamp: new Date(msg.created_at)
              });
            }
          }
          setChatMessages(formattedMessages);
        }
      } catch (error) {
        console.error('Failed to load chat history:', error);
      }
    };
    loadChatHistory();
  }, [session.token]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const addChatMessage = (message: ChatMessage) => {
    setChatMessages(prev => [...prev, message]);
  };

  const handleTakeScreenshot = async () => {
    try {
      setScreenshotLoading(true);
      const response = await window.api.takeScreenshot(session.token);
      
      setCurrentScreenshot(response.screenshot);
      setExtractedText(response.extractedText);

      addChatMessage({
        id: Date.now().toString(),
        type: 'screenshot',
        content: 'Screenshot taken and text extracted',
        extractedText: response.extractedText,
        timestamp: new Date()
      });
    } catch (error: any) {
      addChatMessage({
        id: Date.now().toString(),
        type: 'system',
        content: `Error taking screenshot: ${error.message}`,
        timestamp: new Date()
      });
    } finally {
      setScreenshotLoading(false);
    }
  };

  const handleTakeStructuredScreenshot = async () => {
    try {
      setScreenshotLoading(true);
      const response = await window.api.takeStructuredScreenshot(session.token);
      
      setCurrentScreenshot(response.screenshot);
      setExtractedText(response.structuredData);

      addChatMessage({
        id: Date.now().toString(),
        type: 'screenshot',
        content: 'Structured Screenshot Captured',
        timestamp: new Date()
      });

      addChatMessage({
        id: Date.now().toString(),
        type: 'llm_response',
        content: response.structuredData,
        timestamp: new Date()
      });
    } catch (error: any) {
      addChatMessage({
        id: Date.now().toString(),
        type: 'system',
        content: `Error taking structured screenshot: ${error.message}`,
        timestamp: new Date()
      });
    } finally {
      setScreenshotLoading(false);
    }
  };

  const handleShowAnswer = async () => {
    if (!extractedText.trim()) {
      addChatMessage({
        id: Date.now().toString(),
        type: 'system',
        content: 'No extracted text found. Please take a screenshot first.',
        timestamp: new Date()
      });
      return;
    }

    try {
      setLlmLoading(true);
      const response = await window.api.getPersonaGuidance(session.token, extractedText);

      addChatMessage({
        id: Date.now().toString(),
        type: 'llm_response',
        content: response.response,
        timestamp: new Date()
      });
    } catch (error: any) {
      addChatMessage({
        id: Date.now().toString(),
        type: 'system',
        content: `Error generating answer: ${error.message}`,
        timestamp: new Date()
      });
    } finally {
      setLlmLoading(false);
    }
  };

  const handleSendToLLM = async () => {
    if (!extractedText.trim()) {
      addChatMessage({
        id: Date.now().toString(),
        type: 'system',
        content: 'No extracted text to send. Please take a screenshot first.',
        timestamp: new Date()
      });
      return;
    }

    try {
      setLlmLoading(true);
      const response = await window.api.sendToLLM(session.token, extractedText);

      addChatMessage({
        id: Date.now().toString(),
        type: 'user',
        content: extractedText,
        timestamp: new Date()
      });

      addChatMessage({
        id: Date.now().toString(),
        type: 'llm_response',
        content: response.response,
        timestamp: new Date()
      });
    } catch (error: any) {
      addChatMessage({
        id: Date.now().toString(),
        type: 'system',
        content: `Error sending to LLM: ${error.message}`,
        timestamp: new Date()
      });
    } finally {
      setLlmLoading(false);
    }
  };

  const togglePinned = () => {
    setIsPinned(!isPinned);
    window.api.toggleAlwaysOnTop(!isPinned);
  };

  return (
    <div className="user-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <img src="./assets/Logo.png" alt="TTS" style={{ height: '30px' }} />
          <h1>Welcome, {session.fullName || session.username}</h1>
          <p>ID: {session.userId} | Employee: {session.employeeName || 'N/A'} | Persona: {session.persona || 'Unassigned'}</p>
        </div>
        <div className="controls">
          <button onClick={togglePinned} className="action-btn">{isPinned ? 'Unpin' : 'Pin Window'}</button>
          <button onClick={onLogout} className="logout-button">Logout</button>
        </div>
      </div>

      {/* Monitoring Disclaimer */}
      <div className="monitoring-disclaimer">
        ⚠️ Note: You are being actively monitored for security and quality assurance.
      </div>

      {/* Work Timer */}
      <div className="timer-section">
        <div className="timer" style={{
          color: isWorking ? 'green' : 'red',
          fontSize: '48px',
          fontWeight: 'bold'
        }}>
          {formatTime(timer)}
        </div>
        <button 
          onClick={() => setIsWorking(!isWorking)} 
          className={`work-btn ${isWorking ? 'working' : ''}`}
        >
          {isWorking ? 'Pause Work' : 'Start Working'}
        </button>
        <button 
          onClick={() => { setIsWorking(false); setTimer(0); }} 
          className="clock-out-btn"
        >
          Clock Out
        </button>
      </div>

      {/* Main Dashboard Body */}
      <div className="dashboard-body">
        <div className="chat-container">
          {/* Chat History */}
          <div className="chat-box">
            <div className="chat-box-header">
              <h2>Chat & Analysis</h2>
              <div className="chat-header-actions">
                <button 
                  onClick={handleTakeStructuredScreenshot} 
                  disabled={screenshotLoading}
                  className="chat-header-btn"
                >
                  {screenshotLoading ? 'Capturing...' : '📸 take Screenshot'}
                </button>
                <button 
                  onClick={handleShowAnswer} 
                  disabled={llmLoading || !extractedText.trim()}
                  className="chat-header-btn btn-show-answer"
                >
                  {llmLoading ? 'Analyzing...' : '💡 Show Answer'}
                </button>
              </div>
            </div>
            <div className="messages">
              {chatMessages.length === 0 ? (
                <div className="empty-chat">
                  <p>No messages yet. Take a screenshot to begin!</p>
                </div>
              ) : (
                chatMessages.map(msg => (
                  <div key={msg.id} className={`message message-${msg.type}`}>
                    <div className="message-header">
                      <span className="message-type">{msg.type.toUpperCase()}</span>
                      <span className="message-time">{msg.timestamp.toLocaleTimeString()}</span>
                    </div>
                    <div className="message-content">
                      {msg.content}
                      {msg.extractedText && msg.type === 'screenshot' && (
                        <details className="extracted-text-details">
                          <summary>Show Extracted Text</summary>
                          <pre>{msg.extractedText}</pre>
                        </details>
                      )}
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>
          </div>

          {/* Screenshot Preview */}
          {currentScreenshot && (
            <div className="screenshot-preview">
              <h3>Screenshot Preview</h3>
              <img src={currentScreenshot} alt="Screenshot" />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          <div className="button-group">
            <h3>📸 Screenshot Actions</h3>
            <button
              onClick={handleTakeScreenshot}
              disabled={screenshotLoading}
              className="btn btn-primary btn-large"
            >
              {screenshotLoading ? 'Taking Screenshot...' : '📸 Take Screenshot & Extract Text'}
            </button>
            <p className="button-help">Captures your active browser tab and extracts text using Tesseract API</p>
          </div>

          <div className="button-group">
            <h3>🤖 LLM Analysis</h3>
            <button
              onClick={handleSendToLLM}
              disabled={llmLoading || !extractedText.trim()}
              className="btn btn-secondary btn-large"
            >
              {llmLoading ? 'Processing with LLM...' : '🤖 Send to LLM for Analysis'}
            </button>
            <p className="button-help">Sends extracted text to LLM with your assigned persona for structured analysis</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="dashboard-footer">
        <p>Tech & Talent Solutions © 2026. Empowering Remote Intelligence</p>
      </footer>
    </div>
  );
};
