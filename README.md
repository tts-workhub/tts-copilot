# TTS Copilot

Electron Multi-User Persona Application.

## Getting Started

### Installation

```bash
npm install
```

### Seeding the Database

Before running the app, seed the database with a test admin user:

```bash
npm run seed
```

### Running in Development

```bash
npm run dev
```

### Building for Production

```bash
npm run build
npm run dist
```

## Project Structure

- `main/`: Electron main process files.
- `renderer/`: React frontend code.
- `src/`: Shared logic (personas, auth, database, commands).
- `scripts/`: Utility scripts (seeding, etc.).
