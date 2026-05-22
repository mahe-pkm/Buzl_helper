# Docker Project Stack

This runs the full local stack in Docker:

- Postgres DB
- Backend API (`3000`)
- Admin Dashboard (`5174`)
- Extension Web View (`5173`)

## Start

```powershell
docker compose -f .\docker-compose.project.yml up --build -d
```

## Open

- Extension web view: `http://127.0.0.1:5173`
- Admin dashboard: `http://127.0.0.1:5174`
- Backend API: `http://127.0.0.1:3000/api`

## Logs

```powershell
docker compose -f .\docker-compose.project.yml logs -f
```

## Stop

```powershell
docker compose -f .\docker-compose.project.yml down
```

## Reset DB volume (full clean)

```powershell
docker compose -f .\docker-compose.project.yml down -v
```
