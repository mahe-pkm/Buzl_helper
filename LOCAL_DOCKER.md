# Local Docker Development

This setup runs a local Postgres database for Buzl Helper so schema changes can be tested without touching Supabase or production data.

## 1. Start and prepare local database

```powershell
.\scripts\start-local-docker-db.ps1
```

To also create a local admin user:

```powershell
$env:ADMIN_SEED_PASSWORD = "choose-a-local-password"
.\scripts\start-local-docker-db.ps1
```

The local database URL is:

```text
postgresql://buzl:buzl_local_password@127.0.0.1:54322/buzl_helper?schema=public
```

## 2. Run the backend against Docker Postgres

```powershell
.\scripts\start-local-backend.ps1
```

The API will run at:

```text
http://127.0.0.1:3000/api
```

## 3. Run local dashboard

```powershell
cd .\buzl-fashion-helper-FULL_DEV
npm run dev -- --host 127.0.0.1 --port 5174
```

The dashboard will proxy `/api` to the local backend.

## 4. Run local extension web view

```powershell
cd .\Ext\buzl-fashion-helper
npm run dev -- --host 127.0.0.1 --port 5173
```

In extension settings, use Custom / Localhost API:

```text
http://127.0.0.1:3000/api
```

## Stop local database

```powershell
docker compose -f .\docker-compose.local.yml down
```

To delete the local database volume as well:

```powershell
docker compose -f .\docker-compose.local.yml down -v
```
