import React, { useState, useEffect } from 'react'
import { AdminDashboard } from './AdminDashboard'

function App() {
  const [username, setUsername] = useState('')
  const [session, setSession] = useState<any>(null)
  const [command, setCommand] = useState('')
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)
  const [isWorking, setIsWorking] = useState(false)
  const [timer, setTimer] = useState(0)
  const [isPinned, setIsPinned] = useState(false)

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isWorking) {
      interval = setInterval(() => setTimer(t => t + 1), 1000)
    }
    return () => clearInterval(interval)
  }, [isWorking])

  const handleLogin = async () => {
    try {
      setLoading(true)
      const sess = await window.api.login(username)
      if (sess) {
        setSession(sess)
        setResponse(`Welcome! Logged in as ${username}`)
      } else {
        setResponse('Invalid user')
      }
    } catch (e: any) { 
      setResponse(e.message) 
    } finally {
      setLoading(false)
    }
  }

  const handleSendCommand = async () => {
    try {
      setLoading(true)
      const res = await window.api.sendCommand(session.token, command)
      setResponse(res)
      setCommand('')
    } catch (e: any) {
      setResponse(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await window.api.logout(session.token)
    setSession(null)
    setUsername('')
    setResponse('')
    setIsWorking(false)
    setTimer(0)
  }

  const togglePinned = () => {
    setIsPinned(!isPinned)
    window.api.toggleAlwaysOnTop(!isPinned)
  }

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60)
    const secs = s % 60
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`
  }

  if (!session) {
    // ... (Login form remains the same)
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <img src="./assets/Logo.png" alt="Tech & Talent Solutions" className="login-logo" />
            <h1>Tech & Talent Solutions</h1>
            <p className="login-tagline">Empowering Remote Intelligence</p>
          </div>
          <div className="login-form">
            <h2>TTS Copilot</h2>
            <p>Multi-User Persona Platform</p>
            <input 
              type="text"
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              placeholder="Enter username" 
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              disabled={loading}
            />
            <button onClick={handleLogin} disabled={loading} className="login-button">
              {loading ? 'Logging in...' : 'Login'}
            </button>
            {response && <p className={`login-message ${response.includes('Invalid') || response.includes('error') ? 'error' : 'success'}`}>{response}</p>}
          </div>
        </div>
      </div>
    )
  }

  if (session.role === 'SUPER_ADMIN') {
    return (
        <div className="admin-container">
            <button onClick={handleLogout}>Logout</button>
            <AdminDashboard session={session} />
        </div>
    )
  }

  return (
    <div className="user-dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <h1>User Dashboard</h1>
          <p>Persona: {session.persona || 'Unassigned'}</p>
        </div>
        <div className="controls">
          <button onClick={togglePinned}>{isPinned ? 'Unpin' : 'Pin Window'}</button>
          <button onClick={handleLogout} className="logout-button">Logout</button>
        </div>
      </div>

      <div className="timer-section">
        <div className="timer">{formatTime(timer)}</div>
        <button onClick={() => setIsWorking(!isWorking)}>{isWorking ? 'Pause Work' : 'Start Working'}</button>
        <button onClick={() => { setIsWorking(false); setTimer(0); }}>Clock Out</button>
      </div>

      <div className="dashboard-body">
        <div className="action-buttons">
          <button onClick={async () => {
            const text = await window.api.captureScreenshot()
            setCommand(text)
          }}>Take Screenshot</button>
          <button onClick={handleSendCommand}>Show Answer</button>
        </div>
        <div className="command-section">
          <textarea 
            value={command} 
            onChange={e => setCommand(e.target.value)} 
            placeholder="Parsed text or command..." 
            disabled={loading}
            rows={6}
          />
        </div>
        {response && <div className={`response-box ${response.includes('error') ? 'error' : ''}`}>{response}</div>}
      </div>
    </div>
  )
}
export default App
