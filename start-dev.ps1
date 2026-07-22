# Starts the full ProQuote Zambia dev stack, detached from the launching terminal:
#   - NestJS backend        http://localhost:3001  (npm run start:prod in backend/)
#   - Vite dev server       http://localhost:3000  (all interfaces, LAN-reachable)
#   - Cloudflare quick tunnel -> public *.trycloudflare.com URL (printed when ready;
#     note: quick tunnels mint a NEW random URL on every start)
# Safe to re-run: existing listeners on 3000/3001 and stray cloudflared are stopped
# first. Logs land in .devlogs\ (gitignored).
#
# Usage:  powershell -ExecutionPolicy Bypass -File .\start-dev.ps1

$ErrorActionPreference = 'SilentlyContinue'
$root = $PSScriptRoot
$logs = Join-Path $root '.devlogs'
New-Item -ItemType Directory -Force $logs | Out-Null

foreach ($port in 3000, 3001) {
  Get-NetTCPConnection -LocalPort $port -State Listen |
    Select-Object -ExpandProperty OwningProcess -Unique |
    ForEach-Object { Stop-Process -Id $_ -Force }
}
Get-Process cloudflared | Stop-Process -Force
Start-Sleep -Seconds 1

Start-Process -WindowStyle Hidden -FilePath 'npm.cmd' -ArgumentList 'run', 'start:prod' `
  -WorkingDirectory (Join-Path $root 'backend') `
  -RedirectStandardOutput (Join-Path $logs 'backend.log') `
  -RedirectStandardError (Join-Path $logs 'backend.err.log')

Start-Process -WindowStyle Hidden -FilePath 'npm.cmd' -ArgumentList 'run', 'dev' `
  -WorkingDirectory $root `
  -RedirectStandardOutput (Join-Path $logs 'vite.log') `
  -RedirectStandardError (Join-Path $logs 'vite.err.log')

Start-Process -WindowStyle Hidden -FilePath 'C:\Program Files (x86)\cloudflared\cloudflared.exe' `
  -ArgumentList 'tunnel', '--url', 'http://localhost:3000', '--protocol', 'http2' `
  -RedirectStandardOutput (Join-Path $logs 'tunnel.log') `
  -RedirectStandardError (Join-Path $logs 'tunnel.err.log')

Write-Host 'Starting backend (:3001), frontend (:3000), and tunnel...'
$url = $null
for ($i = 0; $i -lt 30 -and -not $url; $i++) {
  Start-Sleep -Seconds 1
  $url = (Select-String -Path (Join-Path $logs 'tunnel*') -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' -AllMatches).Matches.Value |
    Select-Object -First 1
}

Write-Host ''
Write-Host "  Local:  http://localhost:3000"
Write-Host "  Remote: $(if ($url) { $url } else { 'tunnel still starting - check .devlogs\tunnel.err.log' })"
