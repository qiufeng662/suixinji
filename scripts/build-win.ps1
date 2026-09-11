# Build Windows NSIS + portable packages
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')

$env:CSC_IDENTITY_AUTO_DISCOVERY = 'false'
$env:ELECTRON_BUILDER_CACHE = Join-Path $env:LOCALAPPDATA 'electron-builder\Cache'

npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

npx electron-builder --win
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "OK — see release/ for setup & portable exes"
