# TTS Copilot - Electron Multi-User Persona Application

## Project Overview

**TTS Copilot** is an Electron desktop application that enables up to 100 concurrent users to interact with the system through distinct, isolated personas. The system enforces strict role-based access control with two primary dashboards: a Super Admin Dashboard for system management and a User Dashboard for persona-based interactions.

**Core Value**: Users experience the application through a unique assigned persona that controls their behavior, tone, knowledge boundaries, and response patterns. All outputs are generated according to the user's assigned persona.

## Architecture Overview

### Two-Tier Role System
- **Super Admin**: Full system control (user management, persona management, session monitoring)
- **Regular User**: Constrained interaction based on assigned persona (read-only regarding their own persona)

### Key Components
- **Frontend**: React/Vue-based dashboards for both admin and user interfaces
- **Main Process**: Electron main process handling IPC, window management, database access
- **Authentication**: OAuth-based secure login
- **Database**: Personas and user data storage (specific DB system TBD)
- **Persona Engine**: Logic for persona assignment, retrieval, and intelligent auto-completion of missing details

### Project Structure
```
TTS Copilot/
├── main/                    # Electron main process files
├── renderer/                # React/Vue frontend code
├── src/
│   ├── personas/            # Persona management, retrieval, validation
│   ├── auth/                # OAuth implementation, token handling
│   ├── database/            # Database models, queries, migrations
│   ├── commands/            # Command handling and response generation
│   └── utils/               # Shared utilities, constants
├── dist/                    # Production build output
├── installer/               # EXE installer generation
├── package.json             # Dependencies and scripts
├── electron-builder.yml     # Electron build configuration
└── CLAUDE.md                # This file
```

## Persona System Specifications

### Persona Constraints
- **Maximum size**: 10,000–20,000 characters
- **Recommended size**: 8,000–18,000 characters
- **Isolation**: Personas are completely isolated per user; no cross-persona contamination

### Persona Content Guidelines
Personas should define:
- Character tone and personality
- Knowledge boundaries and expertise limitations
- Response style and formatting preferences
- Any behavioral restrictions or guardrails
- Domain-specific knowledge or lack thereof
- Restrictions on topics or behaviors

### Dynamic Persona Features
- Missing details in personas are intelligently auto-generated while maintaining character consistency
- Persona changes take effect immediately on the next user interaction
- Admins can update personas in real-time without restarting the application

## Authentication & Security

- **OAuth**: Primary authentication method (configuration in `auth/` directory)
- **Session Management**: Each user session is independently tracked
- **Database Security**: All persona and user data must be encrypted at rest
- **IPC Security**: Electron IPC channels must validate sender and message integrity

### Key Security Rules
1. **Persona Isolation**: Ensure personas never leak between users
2. **Admin-Only Operations**: Persona CRUD operations must validate admin role server-side
3. **User Input Validation**: All inputs must be validated before database queries
4. **Session Validation**: All requests must include valid session tokens

## Development Setup

### Prerequisites
- Node.js >= 16.x
- npm or yarn
- Windows development environment (for desktop app testing)

### Installation
```bash
npm install
```

### Running Development Server
```bash
npm run dev          # Start Electron app in dev mode
npm run dev:react    # Start React dev server only
```

### Building for Production
```bash
npm run build        # Build React frontend
npm run dist         # Package Electron application
npm run installer    # Create Setup.exe installer
```

## Testing

- Unit tests for persona logic, auth, and database queries
- Integration tests for IPC communication and persona assignment
- E2E tests for admin and user dashboard workflows
- Test personas should use diverse character types to verify isolation

## Common Workflows

### Adding a New Feature
1. If frontend: modify `renderer/` components
2. If backend logic: add to `src/` (personas/, auth/, commands/, etc.)
3. If database: add migration and update models in `src/database/`
4. Update tests and document in PR

### Creating/Updating a Persona
1. Via Admin Dashboard: Super Admin uploads/edits persona
2. Persona is validated against size and content constraints
3. Database is updated; users see changes on next interaction

### Handling User Interaction
1. User sends command via dashboard
2. Electron main process retrieves user's assigned persona
3. Command + persona are processed by command handler
4. Response is generated according to persona constraints
5. Response is sent back to renderer/user

## Important Context

- **Performance**: Persona size limits (10K–20K chars) are strict to maintain sub-second response times
- **Concurrency**: Design for 100 concurrent users; implement connection pooling and caching
- **Persona Versioning**: Consider versioning personas to allow rollback if needed
- **Audit Logging**: Track all persona changes and admin actions for compliance
- **User Experience**: Users should never encounter raw persona data; all interactions must be abstracted

## Known Constraints & Gotchas

1. **Persona Assignment**: A user can only have one active persona at a time
2. **No Self-Service Persona Changes**: Users cannot modify their own persona (security boundary)
3. **Database Dependency**: Application cannot function without database connectivity
4. **Electron Limitations**: Desktop app; platform-specific installer for Windows only
5. **OAuth Configuration**: Must be set up before first launch; misconfiguration prevents login

## Deployment

### Distribution
- End users download `Setup.exe` installer
- Installer handles installation to user's machine
- Application checks for updates on launch (if auto-update is enabled)

### Database Deployment
- Database migrations must be run before application launch
- Personas must be seeded or available for admin import

## Future Considerations

- Multi-platform support (macOS, Linux)
- Offline mode with local persona caching
- Persona templates and quick-start library
- Advanced persona versioning and A/B testing
- Real-time session analytics dashboard
