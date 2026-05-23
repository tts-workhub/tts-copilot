import React, { useState } from 'react'
import { AdminDashboard } from './AdminDashboard'

function App() {
  const [username, setUsername] = useState('')
  const [session, setSession] = useState<any>(null)
  const [command, setCommand] = useState('')
  const [response, setResponse] = useState('')

  const handleLogin = async () => {
    try {
      // @ts-ignore
      const sess = await window.api.login(username)
      if (sess) {
        setSession(sess)
        setResponse(`Logged in. Role: ${sess.role}`)
      } else {
        setResponse('Invalid user')
      }
    } catch (e: any) { setResponse(e.message) }
  }

  const handleSendCommand = async () => {
    // @ts-ignore
    const res = await window.api.sendCommand(session.token, command)
    setResponse(res)
  }

  if (!session) {
    return (
      <div className="container">
        <h1>TTS Copilot Login</h1>
        <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" />
        <button onClick={handleLogin}>Login</button>
        {response && <p>{response}</p>}
      </div>
    )
  }

  if (session.role === 'SUPER_ADMIN') {
    return <AdminDashboard />
  }

  return (
    <div className="container">
      <h1>User Dashboard</h1>
      <input value={command} onChange={e => setCommand(e.target.value)} placeholder="Command..." />
      <button onClick={handleSendCommand}>Send</button>
      {response && <div className="response-box">{response}</div>}
    </div>
  )
}
export default App
