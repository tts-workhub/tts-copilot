import React, { useState, useEffect } from 'react'
import { AdminDashboard } from './AdminDashboard'
import { UserDashboard } from './UserDashboard'

function App() {
  const [username, setUsername] = useState('')
  const [session, setSession] = useState<any>(null)
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)

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

  const handleLogout = async () => {
    await window.api.logout(session.token)
    setSession(null)
    setUsername('')
    setResponse('')
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

  return <UserDashboard session={session} onLogout={handleLogout} />
}
export default App
