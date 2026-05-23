import React, { useState } from 'react'

function App() {
  const [username, setUsername] = useState('')
  const [token, setToken] = useState('')
  const [command, setCommand] = useState('')
  const [response, setResponse] = useState('')

  const handleLogin = async () => {
    try {
      // @ts-ignore
      const session = await window.api.login(username)
      if (session) {
        setToken(session.token)
        setResponse(`Logged in as ${username}`)
      } else {
        setResponse('User not found. (Please seed database)')
      }
    } catch (error: any) {
      setResponse(`Error: ${error.message}`)
    }
  }

  const handleSendCommand = async () => {
    try {
      // @ts-ignore
      const res = await window.api.sendCommand(token, command)
      setResponse(res)
    } catch (error: any) {
      setResponse(`Error: ${error.message}`)
    }
  }

  return (
    <div className="container">
      <h1>TTS Copilot</h1>
      
      {!token ? (
        <div className="login-box">
          <input 
            type="text" 
            placeholder="Username" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
          />
          <button onClick={handleLogin}>Login</button>
        </div>
      ) : (
        <div className="command-box">
          <p>Token: {token.substring(0, 5)}...</p>
          <input 
            type="text" 
            placeholder="Enter command..." 
            value={command} 
            onChange={(e) => setCommand(e.target.value)} 
          />
          <button onClick={handleSendCommand}>Send</button>
        </div>
      )}

      {response && (
        <div className="response-box">
          <h3>Response:</h3>
          <p>{response}</p>
        </div>
      )}
    </div>
  )
}

export default App
