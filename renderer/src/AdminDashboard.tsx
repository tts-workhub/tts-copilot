import React, { useState, useEffect } from 'react';

// Interfaces based on src/types.ts
interface Persona {
  id: string;
  name: string;
  tone: string;
  personality: string;
  content: string;
}

export const AdminDashboard = () => {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [newPersona, setNewPersona] = useState({ name: '', tone: '', personality: '', content: '' });

  // Placeholder for fetching personas from IPC
  const fetchPersonas = async () => {
    // @ts-ignore
    const data = await window.api.getPersonas(); 
    setPersonas(data);
  };

  const handleCreate = async () => {
    // @ts-ignore
    await window.api.createPersona(newPersona);
    fetchPersonas();
  };

  return (
    <div className="admin-container">
      <h2>Super Admin Dashboard</h2>
      
      <div className="create-persona">
        <h3>Create New Persona</h3>
        <input placeholder="Name" onChange={e => setNewPersona({...newPersona, name: e.target.value})} />
        <textarea placeholder="Content (10k-20k chars)" onChange={e => setNewPersona({...newPersona, content: e.target.value})} />
        <button onClick={handleCreate}>Save Persona</button>
      </div>

      <div className="persona-list">
        <h3>Existing Personas</h3>
        {personas.map(p => (
          <div key={p.id}>{p.name}</div>
        ))}
      </div>
    </div>
  );
};
