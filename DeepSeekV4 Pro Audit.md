# TTS Copilot v1.0.0 - Comprehensive Audit Report

## 1. Executive Summary

TTS Copilot is an Electron + React + better-sqlite3 desktop application for multi-user persona-based LLM interactions. It ships as a 125 MB Windows installer (NSIS). The project is structurally sound but has significant security, architectural, and correctness issues that need addressing before production deployment.

---

## 2. Project Structure & Build

| Aspect | Detail |
|--------|--------|
| Framework | Electron 30.5.1 + electron-vite 6.0.0-beta.1 |
| Frontend | React 19.2.6 + Vite 8.0.14 |
| Database | better-sqlite3 (local SQLite) |
| Build output | `dist/` (NSIS installer ~125 MB, `win-unpacked/` portable) |
| Installer size | ~125 MB - includes Node native modules (better-sqlite3, @napi-rs/canvas) |
| Schema init | 6 tables: `users`, `personas`, `sessions`, `monitoring_screenshots`, `chat_messages`, `api_configs` |

**Verdict: GOOD** - Modern stack, clean build pipeline, installer working.

---

## 3. CRITICAL Issues

### 3.1. API Keys Stored in Plaintext in Database

**Severity: HIGH** | File: `src/database/index.ts:60`, `src/utils/chatService.ts:69`

```typescript
api_key TEXT NOT NULL,  // stored raw - NO encryption
```

The `FEATURES_GUIDE.md` explicitly claims "API keys are encrypted in database" - **this is false**. API keys (OpenAI, Claude, Gemini) are stored unencrypted in the SQLite database. Anyone with file system access can read them.

**Fix:** Implement AES-256 encryption using the `DB_ENCRYPTION_KEY` from `.env` (currently unused).

### 3.2. Fake Session Tokens

**Severity: CRITICAL** | File: `src/auth/index.ts:10`

```typescript
const token = Math.random().toString(36).substring(7)  // ~7 chars, predictable
```

Session tokens are generated with `Math.random()`, which is not cryptographically secure. They're only ~7 alphanumeric characters, making brute-force or guessing trivial. No session timeout enforcement in the application layer (only a DB query check).

**Fix:** Use `crypto.randomBytes()` for tokens, increase to 32+ characters.

### 3.3. No Encryption at Rest

**Severity: HIGH** | Files: `src/database/index.ts`

CLAUDE.md and GEMINI.md both mandate "All persona and user data must be encrypted at rest." This is **not implemented**. The SQLite database stores everything in plaintext including persona content, user data, chat messages, and monitoring screenshots.

### 3.4. `.env` Committed with Placeholder Defaults

**Severity: LOW-MEDIUM** | File: `.env` (line 8)

While `.env` is in `.gitignore`, the file exists with placeholder defaults. If someone copies this as-is and ships it, the app uses `your-secret-encryption-key-here` as the encryption key (once encryption is actually implemented).

### 3.5. `index.css` Contains Corrupt/Syntax-Error Code

**Severity: MEDIUM** | File: `renderer/src/index.css:308-326`

Lines 309-326 are orphaned CSS rules outside any selector block, placed after the `@media` closing brace. This is likely from a bad merge or accidental paste:

```css
  border: none;
  background: #646cff;
  ...
.response-box {
  margin-top: 20px;
  ...
```

This will either be ignored by browsers (after the `}` from line 308) or cause rendering issues.

---

## 4. Security Issues

### 4.1. Missing Input Validation

| File | Issue |
|------|-------|
| `main/index.ts:184` | `auth:login` - only checks `typeof username !== 'string'`, no length limits, no character sanitization |
| `main/index.ts:197` | `persona:create` - accepts arbitrary `persona: any` - no size/content validation despite 10K-20K limit requirement |
| `main/index.ts:256` | `user:create` - only checks `if (!username || !role)`, no validation of role values |

### 4.2. Missing CSRF/Origin Protection

The IPC handlers accept any caller from the renderer process. While preload uses `contextBridge.exposeInMainWorld`, there's no validation that IPC calls actually originate from the approved window.

### 4.3. Password-less Authentication

`src/auth/index.ts:6` - Login takes only a username, no password. This is intentional per the code but means anyone who knows a valid username can log in.

### 4.4. Duplicate IPC Handlers

**Severity: LOW** | File: `main/index.ts`

`window:toggleAlwaysOnTop` (line 151) and `window:always-on-top` (line 372) are duplicate handlers. `auth:logout` is registered twice (line 156 and line 381). The second registration silently overwrites the first, meaning the first handler is dead code.

### 4.5. CSP Too Restrictive for Some Use Cases

File: `renderer/index.html:9` - The CSP blocks `img-src` directives, which could prevent the screenshot preview from loading base64 data URIs. It also blocks `connect-src` for external API calls (the main process handles these, so it's fine in this architecture, but worth noting).

---

## 5. Architecture & Code Quality Issues

### 5.1. CommandHandler Uses Hardcoded OpenAI + `.env` Key

File: `src/commands/index.ts:21-29`

The `CommandHandler` hardcodes `https://api.openai.com/v1/chat/completions` and reads `process.env.LLM_API_KEY` instead of using the multi-provider `ChatService` or `api_configs` table. This is a duplicate/inconsistent implementation - `ChatService` properly uses the configurable API configs from the database, but `command:send` IPC uses this separate path.

### 5.2. Screenshot Storage Without Cleanup

File: `src/utils/chatService.ts:19-24`

Screenshots are written to disk (`userData/screenshots/`) and never cleaned up. Over time this will consume unlimited disk space.

### 5.3. Fixed Monitoring Interval Only Declares Empty Logic

File: `main/index.ts:145-148`

```typescript
setInterval(async () => {
  // Capture logic
}, 120000)
```

This 120-second interval does nothing. It was presumably intended for periodic screen monitoring but was never implemented.

### 5.4. `chat_messages` Schema Has Redundant Fields

File: `src/database/index.ts:46-55`

The `chat_messages` table has both `content TEXT NOT NULL` and separate `extracted_text`/`llm_response` columns. For `screenshot` type messages, `content` contains a generic description while `extracted_text` holds the OCR text. For `llm_response` messages, the response is in `llm_response` while `content` says "LLM Analysis Complete". This is inconsistent and wasteful.

### 5.5. ID Generation Inconsistency

- `persona:create` in `main/index.ts:194` uses `Math.random().toString(36).substring(7)` (7 chars)
- `user:create` in `main/index.ts:256` uses `randomUUID()` (UUID v4)
- `api_configs` uses `randomUUID()`
- Session tokens use `Math.random().toString(36).substring(7)`

### 5.6. No Error Boundary in React Components

File: `renderer/src/main.tsx:6-9`

No `<ErrorBoundary>` component wraps the app. Any uncaught React error will crash the renderer.

### 5.7. PDF Upload Uses `file.path` Without Validation

File: `renderer/src/AdminDashboard.tsx:117`

```typescript
const result = await window.api.uploadPersonaPdf(session.token, file.path);
```

Electron's file input exposes the full local file path. The main process should validate the file type and content server-side, not rely on the renderer-provided path alone. The current handler (`main/index.ts:214`) only checks for file existence.

---

## 6. Documentation Accuracy

| Claim in Docs | Actual Implementation | Status |
|---------------|----------------------|--------|
| "OAuth-based secure login" | Username-only login, no OAuth | **MISMATCH** |
| "All persona and user data must be encrypted at rest" | Plaintext SQLite | **MISMATCH** |
| "API keys are encrypted in database" | Plaintext storage | **MISMATCH** |
| "100 concurrent users" | No connection pooling or caching | **MISMATCH** |
| "Persona Engine: intelligently auto-complete missing details" | Only static extraction from PDF | **PARTIAL** |
| "node:sqlite" in SUMMARY.md | better-sqlite3 in actual code | **MISMATCH** |
| "Unit tests are required for all src/ logic" | No test files exist anywhere | **MISMATCH** |
| "Integration tests for IPC and persona isolation are mandatory" | No test files exist | **MISMATCH** |

---

## 7. Missing Features / Incomplete Implementation

1. **Authentication**: Claimed OAuth, implemented as username-only login
2. **Encryption at rest**: Documented as required, not implemented
3. **Auto-persona completion**: Documented, only basic PDF parsing exists
4. **Monitoring**: The 120s monitoring loop is an empty stub
5. **Session timeout**: Token expiry is in DB but not enforced in handlers
6. **Persona update audit logging**: Not implemented
7. **Database migration system**: None exists; schema is inline `CREATE TABLE IF NOT EXISTS`
8. **Auto-update**: Not configured in electron-builder.yml

---

## 8. Summary of Issues by Severity

| Severity | Count | Key Items |
|----------|-------|-----------|
| **CRITICAL** | 1 | Fake session tokens (non-cryptographic, trivial to brute force) |
| **HIGH** | 3 | Plaintext API keys, no encryption at rest, .env contains defaults |
| **MEDIUM** | 4 | Corrupt CSS, duplicate IPC handlers, redundant chat schema, ID generation inconsistency |
| **LOW** | 6 | No input validation, empty monitoring stub, no screenshot cleanup, no error boundaries, no cleanup, no connection pooling |

---

## 9. Recommended Priority Actions

1. Replace `Math.random()` with `crypto.randomBytes()` for session tokens
2. Implement AES-256 encryption for API keys and persona data in SQLite
3. Add proper input validation to all IPC handlers
4. Fix the corrupt CSS in `renderer/src/index.css`
5. Remove duplicate IPC handler registrations
6. Consolidate LLM calling logic - remove hardcoded OpenAI path in CommandHandler
7. Implement screenshot storage cleanup (retention policy)
8. Either implement OAuth or update documentation to reflect username-only login
9. Add an ErrorBoundary to the React app
10. Implement the monitoring loop or remove the stub
