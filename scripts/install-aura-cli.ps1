# Install aura-cli into %LOCALAPPDATA%\neo4j-aura-cli (not committed).
# Usage: powershell -ExecutionPolicy Bypass -File scripts/install-aura-cli.ps1
$ErrorActionPreference = "Stop"
$Version = "1.9.1"
$Tools = Join-Path $env:LOCALAPPDATA "neo4j-aura-cli"
$ZipUrl = "https://github.com/neo4j/aura-cli/releases/download/v$Version/aura-cli_${Version}_Windows_x86_64.zip"
$Zip = Join-Path $Tools "aura-cli.zip"

New-Item -ItemType Directory -Force -Path $Tools | Out-Null
Write-Host "Downloading $ZipUrl"
Invoke-WebRequest -Uri $ZipUrl -OutFile $Zip
Expand-Archive -Path $Zip -DestinationPath $Tools -Force
Remove-Item $Zip -Force

$Exe = Join-Path $Tools "aura-cli.exe"
if (-not (Test-Path $Exe)) {
  throw "aura-cli.exe not found after extract in $Tools"
}

Write-Host "Installed: $Exe"
& $Exe -v
Write-Host ""
Write-Host "Add to PATH for this session:"
Write-Host "  `$env:Path = `"$Tools;`$env:Path`""
Write-Host "Or permanently: System Settings → Environment Variables → Path → $Tools"
