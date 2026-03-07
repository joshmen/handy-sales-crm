# Development Setup

> Extracted from CLAUDE.md — full development environment setup instructions.

## Default: Frontend LOCAL + Backend in Docker

The frontend runs **locally** (NOT in Docker) for best performance. Docker volume mounts on Windows add ~3s latency per page navigation. Running locally gives instant Hot Module Replacement.

```bash
# 1. Start backend services in Docker (APIs, PostgreSQL, Seq)
docker-compose -f docker-compose.dev.yml up -d

# 2. Start frontend locally (in separate terminal)
cd apps/web && npm run dev
```

```bash
# View logs for specific service
docker-compose -f docker-compose.dev.yml logs -f api_main
docker-compose -f docker-compose.dev.yml logs -f api_mobile
docker-compose -f docker-compose.dev.yml logs -f api_billing
```

## Alternative: Frontend in Docker (slower, only for production simulation)

```bash
docker-compose -f docker-compose.dev.yml --profile web up -d
```

## IMPORTANT: Restart After Backend Code Changes

After making changes to backend code (.NET APIs or shared libraries), you MUST restart the affected Docker containers:

```bash
# Main API changes (apps/api/ or libs/)
docker-compose -f docker-compose.dev.yml up -d --build api_main

# Mobile API changes (apps/mobile/ or libs/)
docker-compose -f docker-compose.dev.yml up -d --build api_mobile

# Billing API changes (apps/billing/)
docker-compose -f docker-compose.dev.yml up -d --build api_billing

# Multiple services changed
docker-compose -f docker-compose.dev.yml up -d --build api_main api_mobile

# All backend services (when unsure)
docker-compose -f docker-compose.dev.yml down && docker-compose -f docker-compose.dev.yml up -d
```

**Frontend changes (apps/web/)**: No restart needed — Next.js hot reload applies changes instantly when running locally.

**Only restart THIS project's containers** — never restart all Docker containers on the machine.

## CRITICAL: Frontend Dev Server Rules (for AI agents)

1. **NEVER delete `apps/web/.next/`** while the dev server is running. This corrupts the server and it will return 500 for ALL pages. The server process becomes a zombie that's hard to kill.

2. **NEVER run `rm -rf .next`** as a troubleshooting step. If needed, stop the server FIRST, then delete, then restart.

3. **The user runs the dev server from their own terminal** (VSCode or separate shell). AI agents cannot see or kill this process reliably via `taskkill /im node.exe` because `netstat` sometimes doesn't show it on Windows.

4. **To find and kill processes on Windows port 1083**, use PowerShell (netstat often fails silently):
   ```powershell
   # Find PID
   powershell.exe -Command "Get-NetTCPConnection -LocalPort 1083 | Select-Object OwningProcess"
   # Kill it
   powershell.exe -Command "Stop-Process -Id <PID> -Force"
   ```

5. **If the server is returning 500 and you can't fix it**, tell the user to restart it manually: `Ctrl+C` then `cd apps/web && npm run dev`

6. **Multiple agents warning**: Other Claude agents may be running on this project simultaneously. Do NOT kill all node.exe processes — this will break other agents' servers and tools.
