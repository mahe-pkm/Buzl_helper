param(
  [int]$Port = 3000
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = Split-Path -Parent $ScriptDir
$BackendDir = Join-Path $Root "buzl-backend"
$LocalDatabaseUrl = "postgresql://buzl:buzl_local_password@127.0.0.1:54322/buzl_helper?schema=public"

$env:DATABASE_URL = $LocalDatabaseUrl
$env:DIRECT_URL = $LocalDatabaseUrl
$env:JWT_SECRET = "local-dev-only-buzl-helper-secret"
$env:ALLOWED_ORIGINS = "http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:5174,http://localhost:5174,http://localhost:$Port,http://127.0.0.1:$Port"

Push-Location $BackendDir
try {
  npm run dev -- --hostname 127.0.0.1 --port $Port
} finally {
  Pop-Location
}
