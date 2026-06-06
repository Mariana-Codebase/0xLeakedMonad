# 0xLeaked — Start all services
# Usage: .\start.ps1

Write-Host "`n  0xLeaked - Iniciando servicios...`n" -ForegroundColor Cyan

$root = $PSScriptRoot

# Kill any previous instances on our ports
$ports = @(3000, 4000, 4101, 4102, 4103)
foreach ($port in $ports) {
    $proc = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -ErrorAction SilentlyContinue
    if ($proc) {
        Stop-Process -Id $proc -Force -ErrorAction SilentlyContinue
    }
}

Start-Sleep -Seconds 1

# Start services in background
Write-Host "  [1/4] API Gateway (port 4000)" -ForegroundColor Yellow
Start-Process -NoNewWindow -FilePath "pnpm" -ArgumentList "dev:api" -WorkingDirectory $root -RedirectStandardOutput "$root\.logs-api.txt" -RedirectStandardError "$root\.logs-api-err.txt"

Start-Sleep -Milliseconds 500

Write-Host "  [2/4] Breach Service (port 4101)" -ForegroundColor Yellow
Start-Process -NoNewWindow -FilePath "pnpm" -ArgumentList "dev:breach" -WorkingDirectory $root -RedirectStandardOutput "$root\.logs-breach.txt" -RedirectStandardError "$root\.logs-breach-err.txt"

Start-Sleep -Milliseconds 500

Write-Host "  [3/4] Analyzer Service (port 4102)" -ForegroundColor Yellow
Start-Process -NoNewWindow -FilePath "pnpm" -ArgumentList "dev:analyzer" -WorkingDirectory $root -RedirectStandardOutput "$root\.logs-analyzer.txt" -RedirectStandardError "$root\.logs-analyzer-err.txt"

Start-Sleep -Milliseconds 500

Write-Host "  [4/4] Web Frontend (port 3000)" -ForegroundColor Yellow
Start-Process -NoNewWindow -FilePath "pnpm" -ArgumentList "dev:web" -WorkingDirectory $root -RedirectStandardOutput "$root\.logs-web.txt" -RedirectStandardError "$root\.logs-web-err.txt"

Start-Sleep -Seconds 3

Write-Host "`n  Todo listo!" -ForegroundColor Green
Write-Host "  Frontend:  http://localhost:3000" -ForegroundColor White
Write-Host "  API:       http://localhost:4000" -ForegroundColor White
Write-Host "  Breach:    http://localhost:4101" -ForegroundColor White
Write-Host "  Analyzer:  http://localhost:4102`n" -ForegroundColor White
Write-Host "  Logs en .logs-*.txt" -ForegroundColor DarkGray
Write-Host ""
