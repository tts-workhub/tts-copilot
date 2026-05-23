# TTS Copilot - Feature Guide

## 🎯 Overview

This guide covers the new features added to TTS Copilot v1.0.0:

1. **Employee Name Management** - Track employees by full name
2. **User Dashboard Chat** - Interactive chat with screenshot analysis
3. **Screenshot & OCR** - Capture and extract text from browser tabs
4. **LLM Integration** - AI-powered analysis with persona context
5. **API Configuration Engine** - Multi-provider LLM management

---

## 🔧 Admin Features

### Employee Name Field

When creating users in the Admin Dashboard:

1. Navigate to **Admin Dashboard → Users** tab
2. Fill in user creation form:
   - **Username**: Unique identifier (e.g., john.smith)
   - **Employee Name**: Full name (e.g., John Smith)
   - **Role**: Select REGULAR_USER or SUPER_ADMIN
   - **Assign Persona**: Choose a persona for the user

3. The employee name will be displayed in the users list for easy identification

**Database Schema:**
```sql
users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  employee_name TEXT,           -- NEW FIELD
  role TEXT NOT NULL,
  assigned_persona_id TEXT,
  created_at DATETIME
)
```

### API Configuration Engine

The **API Configuration** tab allows super admins to manage LLM providers:

#### Adding an API Configuration

1. Navigate to **Admin Dashboard → API Configuration** tab
2. Fill in the configuration form:

   **Provider Selection:**
   - 🤖 **OpenAI** - GPT-4, GPT-4 Turbo, GPT-3.5 Turbo
   - 🧠 **Anthropic Claude** - Claude 3 Opus, Sonnet, Haiku
   - 🔍 **Google Gemini** - Gemini Pro, Pro Vision, 1.5 Pro

   **Required Fields:**
   - **API Key**: Your provider's secret API key
   - **Model Name**: Specific model to use
   
   **Optional:**
   - **Custom Endpoint**: For proxy/alternative endpoints

3. Click **"Add API Configuration"**
4. Click **"Test Connection"** to verify the API works

#### Supported Providers

**OpenAI:**
- Get API Key: https://platform.openai.com/api-keys
- Recommended: GPT-4 for best quality
- Pricing: Pay per token

**Anthropic Claude:**
- Get API Key: https://console.anthropic.com
- Recommended: Claude 3 Opus for complex tasks
- Pricing: Pay per token

**Google Gemini:**
- Get API Key: https://makersuite.google.com/app/apikey
- Recommended: Gemini Pro for balanced performance
- Pricing: Free tier + paid plans

**Security Notes:**
- ✅ API keys are encrypted in database
- ⚠️ Never share API keys publicly
- 🔄 Rotate API keys periodically
- 📊 Monitor API usage for unauthorized access

---

## 👤 User Features

### User Dashboard

When a user logs in, they see the new **User Dashboard** with:

1. **Header Section**
   - Welcome message with name and employee ID
   - Persona assignment display
   - Pin/Unpin window button
   - Logout button

2. **Monitoring Disclaimer**
   - Security notice about active monitoring

3. **Work Timer**
   - Displays elapsed work time (HH:MM:SS format)
   - **Start Working**: Begin tracking work session
   - **Pause Work**: Pause the timer
   - **Clock Out**: End work session and reset timer

4. **Main Dashboard Area**
   - Chat box with message history
   - Screenshot preview panel
   - Action buttons

### Taking a Screenshot

**Feature:** Capture active browser tab and extract text automatically

**Steps:**
1. Have the browser window/tab you want to capture active
2. Click **"📸 Take Screenshot & Extract Text"** button
3. The system will:
   - Capture your active tab
   - Extract text using Tesseract OCR
   - Display preview in screenshot panel
   - Add message to chat history

**Chat Message Shows:**
- Message type: "SCREENSHOT"
- Timestamp
- Extracted text in collapsible section

**Use Cases:**
- Survey forms capture
- Document analysis
- Screen content extraction
- Data collection from web pages

### Sending Text to LLM

**Feature:** Send extracted text to AI with your persona context

**Steps:**
1. Take a screenshot (text will be extracted automatically)
2. Click **"🤖 Send to LLM for Analysis"** button
3. The system will:
   - Retrieve your assigned persona
   - Send extracted text + persona context to LLM
   - Wait for structured response
   - Display response in chat

**Chat Shows:**
- User message: Original extracted text
- LLM response: Structured analysis from AI
- Timestamp for each message

**Persona Context:**
The LLM receives:
```
System Prompt:
"You are a professional assistant with:
- Name: [Your Persona Name]
- Tone: [Tone Style]
- Personality: [Personality Traits]
- Guidelines: [Full Persona Content]"

User Request:
"Please analyze this extracted text: [Your Extracted Text]"
```

**Example Workflow:**
1. User sees survey form on screen
2. Takes screenshot → Text extracted
3. Sends to LLM → AI analyzes survey responses
4. Gets structured output → Appears in chat
5. Chat history preserved for reference

### Chat History

**Features:**
- All messages preserved with timestamps
- Message types: User, Screenshot, LLM Response, System
- Color-coded by type:
  - 🔵 User messages (Blue)
  - 🟢 Screenshots (Green)
  - 🟣 LLM responses (Purple)
  - 🔴 System messages (Red)
- Auto-scroll to latest message
- Collapsible extracted text details

---

## 🗄️ Database Schema

### New Tables & Columns

**Users Table (Updated):**
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  employee_name TEXT,                    -- NEW
  role TEXT NOT NULL,
  assigned_persona_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Chat Messages Table (New):**
```sql
CREATE TABLE chat_messages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  message_type TEXT NOT NULL,            -- 'screenshot', 'llm_response', 'user_message', 'system'
  content TEXT NOT NULL,
  extracted_text TEXT,                   -- Extracted OCR text
  llm_response TEXT,                     -- LLM generated response
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
```

**API Configs Table (Updated):**
```sql
CREATE TABLE api_configs (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,                -- 'openai', 'anthropic', 'google'
  api_key TEXT NOT NULL,
  model_name TEXT NOT NULL,
  endpoint TEXT,                         -- NEW - optional custom endpoint
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔌 API Integration Details

### LLM API Calls

The system supports three LLM providers with automatic format conversion:

**OpenAI Format:**
```javascript
POST https://api.openai.com/v1/chat/completions
{
  model: "gpt-4",
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ],
  temperature: 0.7,
  max_tokens: 1000
}
```

**Anthropic Format:**
```javascript
POST https://api.anthropic.com/v1/messages
{
  model: "claude-3-opus-20240229",
  max_tokens: 1000,
  system: systemPrompt,
  messages: [
    { role: "user", content: userPrompt }
  ]
}
```

**Google Format:**
```javascript
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent
{
  contents: [
    {
      parts: [
        { text: systemPrompt },
        { text: userPrompt }
      ]
    }
  ]
}
```

### Error Handling

Common errors and solutions:

| Error | Cause | Solution |
|-------|-------|----------|
| "No LLM API configured" | No API config added | Go to Admin → API Configuration and add one |
| "No persona assigned" | User has no persona | Assign persona in Users management |
| "API connection failed" | Invalid API key | Check key in API Configuration, regenerate if needed |
| "Model not found" | Invalid model name | Select correct model for your provider |
| "Rate limit exceeded" | Too many requests | Wait or upgrade API plan |

---

## 🚀 Getting Started

### For Admins

1. **Setup LLM API**
   - Go to Admin Dashboard
   - Click "API Configuration" tab
   - Add your LLM provider credentials
   - Test the connection

2. **Create Users with Names**
   - Go to Users tab
   - Add new user with employee name
   - Assign a persona to the user

3. **Monitor Usage**
   - View user list with employee names
   - Track persona assignments
   - Monitor API configuration status

### For Users

1. **First Login**
   - See your dashboard with your persona displayed
   - Verify employee name is shown

2. **Start Working**
   - Click "Start Working" button
   - Timer will start tracking

3. **Take Screenshots**
   - Click "📸 Take Screenshot & Extract Text"
   - See extracted text in chat

4. **Get AI Analysis**
   - Click "🤖 Send to LLM for Analysis"
   - Get structured response from AI
   - Review in chat history

---

## 📊 Performance Considerations

**Screenshot Capture:**
- Average time: 500-1000ms
- Depends on screen resolution
- Tesseract OCR: 1-3 seconds for average screen

**LLM API Calls:**
- Average time: 2-10 seconds
- Depends on LLM provider response time
- Text length affects processing time

**Chat History:**
- Stored in SQLite
- Load previous chats up to 50 most recent messages
- Query optimized with timestamps

---

## 🔐 Security Best Practices

1. **API Keys**
   - Store in secure environment
   - Never commit to version control
   - Rotate regularly (monthly recommended)

2. **Persona Context**
   - Contains sensitive guidelines
   - Shared with LLM provider
   - Review before assignment

3. **Chat History**
   - Local database storage
   - Contains extracted text
   - Implement retention policies

4. **Access Control**
   - Only super admins can configure APIs
   - Users can only see their own chat
   - Session tokens auto-expire

---

## 📝 Troubleshooting

**Screenshot not capturing:**
- Ensure window is in focus
- Check if screenshot-desktop is installed
- Try restarting the application

**Text not extracting:**
- Very low-resolution text may not extract
- Screenshot must have text
- Tesseract works best with clear, printed text

**LLM API not responding:**
- Verify API key is correct
- Check internet connection
- Test API config from admin panel
- Check API provider status page

**Chat not updating:**
- Verify user has persona assigned
- Check chat history for errors
- Review message type in database

---

## 📚 Additional Resources

- **Tesseract.js Documentation**: https://tesseract.projectnaptha.com/
- **OpenAI API Docs**: https://platform.openai.com/docs
- **Anthropic API Docs**: https://docs.anthropic.com
- **Google Gemini API**: https://ai.google.dev

---

**Version:** 1.0.0  
**Last Updated:** May 2026  
**Support**: Check application logs for detailed error information
