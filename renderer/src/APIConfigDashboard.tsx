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
    provider: 'openai',
    apiKey: '',
    modelName: 'gpt-4',
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
      showMessage('API Configs loaded', 'success');
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
      setNewConfig({ provider: 'openai', apiKey: '', modelName: 'gpt-4', endpoint: '' });
      showMessage('API Config created successfully', 'success');
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
      await window.api.testApiConfig(session.token, configId);
      showMessage('API connection test successful!', 'success');
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

  const getProviderInfo = (provider: string) => {
    const info: { [key: string]: { icon: string; name: string; models: string[] } } = {
      openai: {
        icon: '🤖',
        name: 'OpenAI',
        models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-3.5-turbo-16k']
      },
      anthropic: {
        icon: '🧠',
        name: 'Anthropic Claude',
        models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307']
      },
      google: {
        icon: '🔍',
        name: 'Google Gemini',
        models: ['gemini-pro', 'gemini-pro-vision', 'gemini-1.5-pro']
      }
    };
    return info[provider] || { icon: '⚙️', name: 'Unknown', models: [] };
  };

  return (
    <div className="api-config-dashboard">
      {/* Header */}
      <div className="api-header">
        <h2>🔧 API Integration Engine</h2>
        <p>Configure and manage LLM API connections for your platform</p>
      </div>

      {/* Message Notification */}
      {message && (
        <div className={`message message-${message.includes('Error') || message.includes('failed') ? 'error' : message.includes('Test') ? 'info' : 'success'}`}>
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
              onChange={(e) => setNewConfig({ ...newConfig, provider: e.target.value, modelName: 'gpt-4' })}
              className="form-control"
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic Claude</option>
              <option value="google">Google Gemini</option>
            </select>
            <small className="help-text">Select the LLM provider you want to use</small>
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
            <small className="help-text">Keep your API key secure. It will be encrypted in the database.</small>
          </div>

          <div className="form-group">
            <label>Model Name *</label>
            <select
              value={newConfig.modelName}
              onChange={(e) => setNewConfig({ ...newConfig, modelName: e.target.value })}
              className="form-control"
            >
              {getProviderInfo(newConfig.provider).models.map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
            <small className="help-text">Select the model version to use</small>
          </div>

          <div className="form-group">
            <label>Custom Endpoint (Optional)</label>
            <input
              type="text"
              placeholder="Leave empty for default endpoint"
              value={newConfig.endpoint}
              onChange={(e) => setNewConfig({ ...newConfig, endpoint: e.target.value })}
              className="form-control"
            />
            <small className="help-text">Use this if you have a custom proxy or alternative endpoint</small>
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
              <p>No API configurations yet. Add one above to get started.</p>
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
                      <div className="detail-item">
                        <label>Model:</label>
                        <span>{config.model_name}</span>
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
                        {testingConfigId === config.id ? '⏳ Testing...' : '🔌 Test Connection'}
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

        {/* Integration Guide */}
        <div className="section integration-guide">
          <h3>📚 Integration Guide</h3>
          
          <div className="guide-content">
            <h4>How It Works:</h4>
            <ol>
              <li>
                <strong>Configure API:</strong> Add your LLM provider's API key and select the model
              </li>
              <li>
                <strong>Test Connection:</strong> Use the "Test Connection" button to verify your API is working
              </li>
              <li>
                <strong>User Assignment:</strong> Assign personas to users in the User Management section
              </li>
              <li>
                <strong>LLM Processing:</strong> When users submit survey responses, they're processed with the configured LLM and assigned persona
              </li>
            </ol>

            <h4>Supported Providers:</h4>
            <div className="provider-list">
              <div className="provider-item">
                <strong>🤖 OpenAI</strong>
                <p>GPT-4, GPT-4 Turbo, GPT-3.5 Turbo. Get your API key at <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">platform.openai.com</a></p>
              </div>
              <div className="provider-item">
                <strong>🧠 Anthropic Claude</strong>
                <p>Claude 3 Opus, Sonnet, Haiku. Get your API key at <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer">console.anthropic.com</a></p>
              </div>
              <div className="provider-item">
                <strong>🔍 Google Gemini</strong>
                <p>Gemini Pro, Gemini Pro Vision. Get your API key at <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer">makersuite.google.com</a></p>
              </div>
            </div>

            <h4>⚠️ Security Notes:</h4>
            <ul>
              <li>API keys are stored securely in the database</li>
              <li>Never share your API keys with anyone</li>
              <li>Regularly rotate your API keys for security</li>
              <li>Monitor your API usage to detect any unauthorized access</li>
              <li>Keep your model selection updated with the latest available models</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
