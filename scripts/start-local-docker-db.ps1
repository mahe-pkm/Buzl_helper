param(
  [string]$AdminPassword = $env:ADMIN_SEED_PASSWORD
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = Split-Path -Parent $ScriptDir
$ComposeFile = Join-Path $Root "docker-compose.local.yml"
$BackendDir = Join-Path $Root "buzl-backend"

$LocalDatabaseUrl = "postgresql://buzl:buzl_local_password@127.0.0.1:54322/buzl_helper?schema=public"

Write-Host "Starting local Postgres container..."
docker compose -f $ComposeFile up -d postgres

$ContainerId = (docker compose -f $ComposeFile ps -q postgres).Trim()
if (-not $ContainerId) {
  throw "Local Postgres container did not start."
}

Write-Host "Waiting for local Postgres to become healthy..."
$IsHealthy = $false
for ($i = 0; $i -lt 60; $i++) {
  $Health = (docker inspect --format "{{.State.Health.Status}}" $ContainerId 2>$null).Trim()
  if ($Health -eq "healthy") {
    $IsHealthy = $true
    break
  }
  Start-Sleep -Seconds 1
}

if (-not $IsHealthy) {
  throw "Local Postgres did not become healthy in time."
}

Push-Location $BackendDir
try {
  $env:DATABASE_URL = $LocalDatabaseUrl
  $env:DIRECT_URL = $LocalDatabaseUrl

  Write-Host "Generating Prisma client for local schema..."
  npx prisma generate

  Write-Host "Applying Prisma schema to local Docker Postgres..."
  npx prisma db push

  if ($AdminPassword) {
    Write-Host "Seeding local admin user..."
    $env:ADMIN_SEED_PASSWORD = $AdminPassword
    npx tsx prisma/seed.ts
  } else {
    Write-Host "Skipping admin seed. To seed one, rerun with ADMIN_SEED_PASSWORD set."
  }
} finally {
  Pop-Location
}

Write-Host ""
Write-Host "Local Docker database is ready."
Write-Host "DATABASE_URL=$LocalDatabaseUrl"
