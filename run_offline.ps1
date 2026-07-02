<#
.SYNOPSIS
    Start ConfigFoundry using the offline virtualenv created by
    install_offline.ps1. No network access used or required.

.EXAMPLE
    .\run_offline.ps1 -- --port 9000 --no-browser
#>

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $RepoRoot

if (-not (Test-Path ".venv\Scripts\python.exe")) {
    Write-Host "[FAIL] .venv\ not found. Run .\install_offline.ps1 first." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "frontend\out") -or -not (Get-ChildItem "frontend\out" -ErrorAction SilentlyContinue)) {
    Write-Host "[!] frontend\out\ is missing -- the UI will 404. Run .\install_offline.ps1 to build it." -ForegroundColor Yellow
}

& .\.venv\Scripts\python.exe server.py @args
