# Full Cloudflare deploy: secrets + Worker
# Run from repo root: .\backend\scripts\deploy-all.ps1

$ErrorActionPreference = "Stop"
$backend = Resolve-Path (Join-Path $PSScriptRoot "..")

Push-Location $backend
try {
    Write-Host "1/2 Syncing secrets from .dev.vars..."
    & "$PSScriptRoot\sync-secrets.ps1"

    Write-Host "2/2 Deploying Worker (navix-api)..."
    npm run deploy

    Write-Host ""
    Write-Host "Backend deployed. Deploy frontend with:"
    Write-Host "  cd frontend"
    Write-Host "  npm run build"
    Write-Host "  npx wrangler pages deploy dist --project-name=navix-frontend"
} finally {
    Pop-Location
}
