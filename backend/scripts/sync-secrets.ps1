# Sync secrets from .dev.vars to Cloudflare Worker (navix-api).
# Run from backend/: .\scripts\sync-secrets.ps1
# Requires: wrangler login completed.

$ErrorActionPreference = "Stop"
$varsFile = Resolve-Path (Join-Path (Join-Path $PSScriptRoot "..") ".dev.vars")

if (-not (Test-Path $varsFile)) {
    Write-Error "Missing .dev.vars. Copy .dev.vars.example to .dev.vars and fill in values."
}

Get-Content $varsFile | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) { return }
    $eq = $line.IndexOf("=")
    if ($eq -lt 1) { return }

    $name = $line.Substring(0, $eq).Trim()
    $value = $line.Substring($eq + 1).Trim()
    if (-not $value) {
        Write-Host "Skipping empty secret: $name"
        return
    }

    Write-Host "Setting secret: $name"
    $value | npx wrangler secret put $name
}

Write-Host "Done. Deploy with: npm run deploy"
