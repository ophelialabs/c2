# .NET Aspire + React Frontend Application

A full-stack application combining .NET Aspire orchestration with a React frontend built using Vite.

## Project Structure

- **dotnet.AppHost/** - .NET Aspire host for orchestrating services
- **dotnet.Server/** - ASP.NET Core backend API server
- **frontend/** - React + TypeScript + Vite frontend application

## Prerequisites

Before deploying locally, ensure you have:

- **.NET SDK 10.0+** (or version specified in the project)
  - Download: https://dotnet.microsoft.com/download
  - Verify: `dotnet --version`

- **Node.js 20.19.0 or >=22.12.0**
  - Download: https://nodejs.org/
  - Verify: `node --version`

- **pnpm** (package manager for the frontend)
  ```bash
  npm install -g pnpm
  ```

## Local Deployment

### Option 1: Using .NET Aspire (Recommended)

Aspire automatically orchestrates both the backend and frontend, managing service discovery and proxy settings.

#### Step 1: Start the Aspire AppHost

From the project root, run:

```bash
cd dotnet.AppHost
dotnet run
```

This will:
- Start the .NET backend server
- Start the Vite development server for the frontend
- Expose the application at `http://localhost:5173` (or the Aspire Dashboard URL)
- Handle all service-to-service communication automatically

### Option 2: Manual Development (Separate Terminals)

If you prefer running services independently:

#### Terminal 1: Start the Backend Server

```bash
cd dotnet.Server
dotnet run
```

The server will start on `http://localhost:5381` (HTTP) or `https://localhost:7523` (HTTPS).

#### Terminal 2: Start the Frontend Dev Server

```bash
cd frontend
pnpm install  # Only needed on first run or after dependency changes
pnpm dev
```

The frontend will start on `http://localhost:5173`.

**Note:** When running separately, ensure the Vite proxy is correctly configured to reach your backend. The `vite.config.ts` includes fallback logic for this:

```typescript
target: process.env.services__server__https__0 || process.env.services__server__http__0 || 'http://localhost:5381'
```

## Environment Variables

### Backend (.NET)

Configuration files:
- `dotnet.Server/appsettings.json` - General settings
- `dotnet.Server/appsettings.Development.json` - Development overrides

### Frontend (React + Vite)

When using Aspire, the following environment variables are automatically set:
- `services__server__https__0` - HTTPS endpoint of the backend
- `services__server__http__0` - HTTP endpoint of the backend

## Available Commands

### Frontend

```bash
cd frontend

pnpm dev        # Start development server
pnpm build      # Build for production
pnpm lint       # Run ESLint
pnpm preview    # Preview production build
```

### Backend

```bash
cd dotnet.Server

dotnet run      # Run with hot reload
dotnet build    # Build the project
dotnet clean    # Clean build artifacts
```

### AppHost (Orchestration)

```bash
cd dotnet.AppHost

dotnet run      # Start all services with Aspire
```

## API Endpoints

The backend API is typically available at:

- **Development**: `http://localhost:5381` or `https://localhost:7523`
- **From Frontend**: `/api/*` (proxied via Vite dev server)

Example:
- Backend direct: `http://localhost:5381/api/weatherforecast`
- Frontend proxy: `http://localhost:5173/api/weatherforecast`

## Health Check

The backend includes a health check endpoint:

```
GET /health
```

## Troubleshooting

### "Must set target or forward" Proxy Error

**Cause:** The Vite proxy can't reach the backend server.

**Solution:** 
1. Ensure the backend is running (see Option 2 above)
2. Verify the fallback target URL in `frontend/vite.config.ts` matches your backend's actual port
3. If using Aspire, ensure you started it with `dotnet run` from the AppHost directory

### Port Already in Use

If a port is already in use, you can:

1. **Change the Vite dev server port:**
   ```bash
   cd frontend
   pnpm dev -- --port 3000
   ```

2. **Change the backend server ports** in `dotnet.Server/Properties/launchSettings.json`

### Dependencies Not Installed

Reinstall dependencies:

```bash
# Frontend
cd frontend
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Backend (.NET restores automatically)
cd dotnet.Server
dotnet restore
```

## Hot Reloading

- **Frontend**: Vite provides instant hot module replacement (HMR) for React components
- **Backend**: .NET hot reload is enabled in development mode (`dotnet run`)

## Building for Production

```bash
# Build frontend
cd frontend
pnpm build

# Publish backend
cd dotnet.Server
dotnet publish -c Release
```

Artifacts will be in:
- Frontend: `frontend/dist/`
- Backend: `dotnet.Server/bin/Release/net10.0/publish/`

## Support

For issues:
1. Check the troubleshooting section above
2. Review service logs in the Aspire Dashboard (usually at `http://localhost:15000`)
3. Check the frontend dev server output in the terminal
4. Review backend logs in its terminal output
