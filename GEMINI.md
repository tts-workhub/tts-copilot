# TTS Copilot: Project Instructions & Conventions

This file provides critical guidance for all AI agents and developers working on the TTS Copilot project. It supplements the project documentation found in `CLAUDE.md`.

## Project Mission
**TTS Copilot** is a high-concurrency (100+ users) Electron application where every user interaction is mediated by a strictly isolated **Persona**. The system ensures that all outputs align with the persona's tone, knowledge boundaries, and behavioral restrictions.

## Core Architectural Mandates

### 1. Two-Tier Role System
- **Super Admin**: Only role permitted to perform CRUD operations on users and personas. All admin actions must be server-side (or database-layer) validated.
- **Regular User**: Access is strictly limited to their own dashboard and the persona-driven interaction interface. Users must never see raw persona data.

### 2. Persona Isolation (Security #1 Priority)
- **Zero Contamination**: Personas must be completely isolated. Logic must guarantee that Persona A never influences the response for User B.
- **Retrieval Logic**: Every command request must explicitly retrieve the specific persona assigned to the requesting user before processing.

### 3. Persona Engine Constraints
- **Size Limits**: 10,000 to 20,000 characters.
- **Performance**: Maintain sub-second response times despite persona size. Optimize retrieval and command processing.
- **Dynamic Completion**: Intelligently auto-generate missing persona details to maintain character consistency.

## Development & Code Conventions

### Structure
- `main/`: Electron main process (IPC, window mgmt, DB).
- `renderer/`: Frontend (React/Vue).
- `src/`: Shared logic, divided by domain (`auth/`, `personas/`, `database/`, `commands/`).

### Security Standards
- **OAuth**: Primary authentication. Token handling must be secure.
- **Encryption**: All persona and user data must be encrypted at rest in the database.
- **IPC Validation**: All Electron IPC channels must validate the sender's identity and message integrity.
- **Input Sanitization**: All user inputs must be validated/sanitized before being used in database queries or persona prompts.

### Workflow Protocols
- **Feature Addition**:
    - Frontend changes -> `renderer/`
    - Backend/Business logic -> `src/`
    - Database schema changes -> `src/database/` (always include migrations).
- **Testing**:
    - Unit tests are required for all `src/` logic.
    - Integration tests for IPC and persona isolation are mandatory.
    - E2E tests for both Admin and User dashboards.

## Agent Guidelines
- **Role Alignment**: When implementing features, ensure that persona constraints are respected.
- **Validation**: Never assume a user is an admin; always verify roles for sensitive operations.
- **Redundancy**: Avoid "just-in-case" logic; keep implementation focused on the persona-centric architecture.
- **Performance First**: Prioritize efficient persona retrieval and minimal latency in the command pipeline.
