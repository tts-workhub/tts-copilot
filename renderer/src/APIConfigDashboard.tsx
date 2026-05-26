import React, { useState, useEffect } from 'react';
import './APIConfigDashboard.css';

interface ApiConfig {
  id: string;
  provider: string;
  model_name: string;
  endpoint?: string;
}

export const APIConfigDashboard = ({ session }: { session: any }) => {
  const [apiConfigs, setApiConfigs] = useState<ApiConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [testingConfigId, setTestingConfigId] = useState<string | null>(null);
  
  // Form state
  const [newConfig, setNewConfig] = useState({
    provider: 'google',
    apiKey: '',
    modelName: 'gemini-1.5-flash',
    endpoint: ''
  });

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const data = await window.api.getApiConfigs(session.token);
      setApiConfigs(data || []);
    } catch (error: any) {
      showMessage(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateConfig = async () => {
    if (!newConfig.apiKey || !newConfig.modelName) {
      showMessage('Please fill in all required fields', 'error');
      return;
    }

    try {
      setLoading(true);
      await window.api.createApiConfig(session.token, newConfig);
      setNewConfig({ provider: 'google', apiKey: '', modelName: 'gemini-1.5-flash', endpoint: '' });
      showMessage('API Config created successfully and encrypted!', 'success');
      fetchConfigs();
    } catch (error: any) {
      showMessage(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConfig = async (configId: string) => {
    try {
      setTestingConfigId(configId);
      const result = await window.api.testApiConfig(session.token, configId);
      showMessage(result.message || 'API connection test successful!', 'success');
    } catch (error: any) {
      showMessage(`Test failed: ${error.message}`, 'error');
    } finally {
      setTestingConfigId(null);
    }
  };

  const handleDeleteConfig = async (configId: string) => {
    if (!window.confirm('Are you sure you want to delete this API config?')) return;

    try {
      setLoading(true);
      await window.api.deleteApiConfig(session.token, configId);
      showMessage('API Config deleted successfully', 'success');
      fetchConfigs();
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

  const updateProviderDefaults = (p: string) => {
    let model = 'gemini-1.5-flash';
    let end = '';
    
    if (p === 'openai') model = 'gpt-4o';
    if (p === 'deepseek') {
      model = 'deepseek-chat';
      end = 'https://api.deepseek.com/v1/chat/completions';
    }
    if (p === 'custom') {
      model = 'gpt-oss-20b';
      end = 'https://your-digitalocean-endpoint.com/v1/chat/completions';
    }

    setNewConfig({ ...newConfig, provider: p, modelName: model, endpoint: end });
  };

  const getProviderInfo = (provider: string) => {
    const info: { [key: string]: { icon: string; name: string } } = {
      openai: { icon: '🤖', name: 'OpenAI' },
      anthropic: { icon: '🧠', name: 'Anthropic Claude' },
      google: { icon: '🔍', name: 'Google Gemini' },
      deepseek: { icon: '🐳', name: 'DeepSeek' },
      custom: { icon: '⚙️', name: 'Custom/OSS' }
    };
    return info[provider] || { icon: '⚙️', name: provider };
  };

  return (
    <div className="api-config-dashboard">
      {/* Header */}
      <div className="api-header">
        <h2>🔧 Centralized API Integration</h2>
        <p>Configure LLM connections for all users. All keys are AES-256 encrypted.</p>
      </div>

      {/* Message Notification */}
      {message && (
        <div className={`message message-${message.includes('Error') || message.includes('failed') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      <div className="api-content">
        {/* Create New Config Section */}
        <div className="section create-section">
          <h3>➕ Add New API Configuration</h3>
          
          <div className="form-group">
            <label>LLM Provider *</label>
            <select
              value={newConfig.provider}
              onChange={(e) => updateProviderDefaults(e.target.value)}
              className="form-control"
            >
              <option value="google">Google Gemini</option>
              <option value="openai">OpenAI</option>
              <option value="deepseek">DeepSeek</option>
              <option value="custom">Custom (OSS / DigitalOcean)</option>
              <option value="anthropic">Anthropic Claude</option>
            </select>
          </div>

          <div className="form-group">
            <label>API Key *</label>
            <input
              type="password"
              placeholder="Enter your API key"
              value={newConfig.apiKey}
              onChange={(e) => setNewConfig({ ...newConfig, apiKey: e.target.value })}
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label>Model Name *</label>
            <input
              type="text"
              placeholder="e.g. gemini-1.5-flash"
              value={newConfig.modelName}
              onChange={(e) => setNewConfig({ ...newConfig, modelName: e.target.value })}
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label>Custom Endpoint (Optional)</label>
            <input
              type="text"
              placeholder="Leave empty for default"
              value={newConfig.endpoint}
              onChange={(e) => setNewConfig({ ...newConfig, endpoint: e.target.value })}
              className="form-control"
            />
          </div>

          <button
            onClick={handleCreateConfig}
            className="btn btn-primary"
            disabled={loading || !newConfig.apiKey}
          >
            {loading ? 'Adding...' : '➕ Add API Configuration'}
          </button>
        </div>

        {/* Existing Configs */}
        <div className="section configs-list">
          <h3>Active API Configurations ({apiConfigs.length})</h3>
          
          {apiConfigs.length === 0 ? (
            <div className="empty-state">
              <p>No API configurations yet.</p>
            </div>
          ) : (
            <div className="configs-grid">
              {apiConfigs.map((config) => {
                const providerInfo = getProviderInfo(config.provider);
                return (
                  <div key={config.id} className="config-card">
                    <div className="config-header">
                      <span className="provider-icon">{providerInfo.icon}</span>
                      <div className="config-title">
                        <h4>{providerInfo.name}</h4>
                        <span className="model-badge">{config.model_name}</span>
                      </div>
                    </div>

                    <div className="config-details">
                      <div className="detail-item">
                        <label>Provider:</label>
                        <span>{config.provider.toUpperCase()}</span>
                      </div>
                      {config.endpoint && (
                        <div className="detail-item">
                          <label>Endpoint:</label>
                          <span className="endpoint">{config.endpoint}</span>
                        </div>
                      )}
                    </div>

                    <div className="config-actions">
                      <button
                        onClick={() => handleTestConfig(config.id)}
                        className="btn btn-small btn-info"
                        disabled={testingConfigId === config.id}
                      >
                        {testingConfigId === config.id ? '⏳ Testing...' : '🔌 Test'}
                      </button>
                      <button
                        onClick={() => handleDeleteConfig(config.id)}
                        className="btn btn-small btn-danger"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
