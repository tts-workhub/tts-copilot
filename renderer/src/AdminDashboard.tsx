import React, { useState, useEffect } from 'react';
import './AdminDashboard.css';
import { APIConfigDashboard } from './APIConfigDashboard';

interface Persona {
  id: string;
  name: string;
  tone: string;
  personality: string;
  content: string;
}

interface User {
  id: string;
  username: string;
  employee_name?: string;
  role: string;
  assigned_persona_id: string | null;
}

export const AdminDashboard = ({ session }: { session: any }) => {
  const [activeTab, setActiveTab] = useState<'personas' | 'users' | 'api_config'>('personas');
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Persona form state
  const [newPersona, setNewPersona] = useState({
    name: '',
    tone: '',
    personality: '',
    content: ''
  });

  // User form state
  const [newUser, setNewUser] = useState({
    username: '',
    employeeName: '',
    role: 'REGULAR_USER',
    personaId: ''
  });

  // Load personas and users on mount
  useEffect(() => {
    fetchPersonas();
    fetchUsers();
  }, []);

  const fetchPersonas = async () => {
    try {
      setLoading(true);
      const data = await window.api.getPersonas(session.token);
      setPersonas(data || []);
      showMessage('Personas loaded', 'success');
    } catch (error: any) {
      showMessage(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await window.api.getUsers(session.token);
      setUsers(data || []);
      showMessage('Users loaded', 'success');
    } catch (error: any) {
      showMessage(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePersona = async () => {
    if (!newPersona.name) {
      showMessage('Please enter a persona name', 'error');
      return;
    }

    try {
      setLoading(true);
      await window.api.createPersona(session.token, newPersona);
      setNewPersona({ name: '', tone: '', personality: '', content: '' });
      showMessage('Persona created successfully', 'success');
      fetchPersonas();
    } catch (error: any) {
      showMessage(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePersona = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this persona?')) return;

    try {
      setLoading(true);
      await window.api.deletePersona(session.token, id);
      showMessage('Persona deleted successfully', 'success');
      fetchPersonas();
    } catch (error: any) {
      showMessage(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadPdf = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      showMessage('Processing PDF...', 'info');
      const result = await window.api.uploadPersonaPdf(session.token, file.path);
      showMessage('Persona created from PDF successfully', 'success');
      fetchPersonas();
    } catch (error: any) {
      showMessage(`PDF upload failed: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.username) {
      showMessage('Please enter a username', 'error');
      return;
    }

    try {
      setLoading(true);
      await window.api.createUser(session.token, newUser.username, newUser.employeeName, newUser.role, newUser.personaId);
      setNewUser({ username: '', employeeName: '', role: 'REGULAR_USER', personaId: '' });
      showMessage('User created successfully', 'success');
      fetchUsers();
    } catch (error: any) {
      showMessage(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (userId: string, personaId: string) => {
    try {
      setLoading(true);
      await window.api.updateUser(session.token, userId, personaId);
      showMessage('User persona updated successfully', 'success');
      fetchUsers();
    } catch (error: any) {
      showMessage(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      setLoading(true);
      await window.api.deleteUser(session.token, userId);
      showMessage('User deleted successfully', 'success');
      fetchUsers();
    } catch (error: any) {
      showMessage(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (msg: string, type: 'success' | 'error' | 'info') => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div className="admin-dashboard">
      {/* Header with Branding */}
      <div className="admin-header">
        <div className="logo-section">
          <img src="./assets/Logo.png" alt="Tech & Talent Solutions" className="logo" />
          <div className="brand-info">
            <h1>Tech & Talent Solutions</h1>
            <p className="tagline">Empowering Remote Intelligence</p>
          </div>
        </div>
      </div>

      {/* Message Notification */}
      {message && (
        <div className={`message message-${message.includes('Error') || message.includes('failed') ? 'error' : message.includes('Processing') ? 'info' : 'success'}`}>
          {message}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="tabs">
        <button
          className={`tab-button ${activeTab === 'personas' ? 'active' : ''}`}
          onClick={() => setActiveTab('personas')}
        >
          📋 Personas
        </button>
        <button
          className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 Users
        </button>
        <button
          className={`tab-button ${activeTab === 'api_config' ? 'active' : ''}`}
          onClick={() => setActiveTab('api_config')}
        >
          🔧 API Configuration
        </button>
      </div>

      {/* Loading State */}
      {loading && <div className="loading">Loading...</div>}

      {/* Personas Tab */}
      {activeTab === 'personas' && (
        <div className="tab-content">
          <h2>Persona Management</h2>

          {/* PDF Upload Section */}
          <div className="section upload-section">
            <h3>📄 Upload Persona from PDF</h3>
            <label htmlFor="pdf-upload" className="file-upload-label">
              <input
                id="pdf-upload"
                type="file"
                accept=".pdf"
                onChange={handleUploadPdf}
                disabled={loading}
              />
              Choose PDF File
            </label>
            <p className="help-text">Upload a PDF to automatically extract persona information</p>
          </div>

          {/* Create Persona Section */}
          <div className="section create-section">
            <h3>➕ Create New Persona</h3>
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                placeholder="Persona name"
                value={newPersona.name}
                onChange={(e) => setNewPersona({ ...newPersona, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Tone</label>
              <input
                type="text"
                placeholder="e.g., Professional, Friendly, Creative"
                value={newPersona.tone}
                onChange={(e) => setNewPersona({ ...newPersona, tone: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Personality</label>
              <input
                type="text"
                placeholder="Brief personality description"
                value={newPersona.personality}
                onChange={(e) => setNewPersona({ ...newPersona, personality: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Content/Guidelines</label>
              <textarea
                placeholder="Full persona content, guidelines, boundaries..."
                value={newPersona.content}
                onChange={(e) => setNewPersona({ ...newPersona, content: e.target.value })}
                rows={6}
              />
            </div>
            <button onClick={handleCreatePersona} className="btn btn-primary" disabled={loading}>
              Save Persona
            </button>
          </div>

          {/* Personas List */}
          <div className="section personas-list">
            <h3>Existing Personas ({personas.length})</h3>
            {personas.length === 0 ? (
              <p className="empty-state">No personas yet. Create one above or upload a PDF.</p>
            ) : (
              <div className="persona-grid">
                {personas.map((p) => (
                  <div key={p.id} className="persona-card">
                    <div className="persona-header">
                      <h4>{p.name}</h4>
                      <span className="persona-tone">{p.tone}</span>
                    </div>
                    <p className="persona-personality">{p.personality}</p>
                    <p className="persona-content">{p.content.substring(0, 100)}...</p>
                    <div className="persona-actions">
                      <button
                        onClick={() => handleDeletePersona(p.id)}
                        className="btn btn-small btn-danger"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="tab-content">
          <h2>User Management</h2>

          {/* Create User Section */}
          <div className="section create-section">
            <h3>➕ Add New User</h3>
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                placeholder="Enter username"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Employee Name</label>
              <input
                type="text"
                placeholder="Enter employee name"
                value={newUser.employeeName}
                onChange={(e) => setNewUser({ ...newUser, employeeName: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Role</label>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              >
                <option value="REGULAR_USER">Regular User</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </select>
            </div>
            <div className="form-group">
              <label>Assign Persona</label>
              <select
                value={newUser.personaId}
                onChange={(e) => setNewUser({ ...newUser, personaId: e.target.value })}
              >
                <option value="">-- Select a Persona --</option>
                {personas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <button onClick={handleCreateUser} className="btn btn-primary" disabled={loading}>
              Create User
            </button>
          </div>

          {/* Users List */}
          <div className="section users-list">
            <h3>Users ({users.length})</h3>
            {users.length === 0 ? (
              <p className="empty-state">No users yet. Create one above.</p>
            ) : (
              <div className="table-responsive">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Employee Name</th>
                      <th>Role</th>
                      <th>Assigned Persona</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td>{user.username}</td>
                        <td>{user.employee_name || '-'}</td>
                        <td>
                          <span className={`role-badge role-${user.role.toLowerCase()}`}>
                            {user.role}
                          </span>
                        </td>
                        <td>
                          <select
                            value={user.assigned_persona_id || ''}
                            onChange={(e) => handleUpdateUser(user.id, e.target.value)}
                            className="persona-select"
                          >
                            <option value="">-- No Persona --</option>
                            {personas.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="btn btn-small btn-danger"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* API Configuration Tab */}
      {activeTab === 'api_config' && (
        <APIConfigDashboard session={session} />
      )}
    </div>
  );
};
