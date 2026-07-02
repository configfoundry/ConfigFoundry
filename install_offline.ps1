<#
.SYNOPSIS
    Install ConfigFoundry with ZERO internet access (Windows).

.DESCRIPTION
    Requires only: python (3.10+), and node (ONLY if you need to rebuild
    the frontend -- a pre-built frontend\out\ is used as-is if present).

    Mirrors install_offline.sh exactly -- see that file's header comment
    and docs/airgap.md for the full explanation.
#>

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $RepoRoot

function Info($msg)  { Write-Host "==> $msg" -ForegroundColor Cyan }
function Ok($msg)    { Write-Host "[OK] $msg" -ForegroundColor Green }
function WarnMsg($msg) { Write-Host "[!] $msg" -ForegroundColor Yellow }
function Fail($msg)  { Write-Host "[FAIL] $msg" -ForegroundColor Red; exit 1 }

Write-Host "=================================================================="
Write-Host "  ConfigFoundry -- offline installer (Windows)"
Write-Host "=================================================================="
Write-Host ""

# ---------------------------------------------------------------------
# 1. Verify Python
# ---------------------------------------------------------------------
Info "Checking for Python 3.10+..."
$pythonCmd = Get-Command python -ErrorAction SilentlyContinue
if (-not $pythonCmd) {
    Fail "python not found on PATH. Install Python 3.10 or newer, then re-run this script."
}
$pyVersionOutput = & python -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')"
$pyOk = & python -c "import sys; print(1 if sys.version_info >= (3, 10) else 0)"
if ($pyOk -ne "1") {
    Fail "Python $pyVersionOutput found, but 3.10+ is required."
}
Ok "Python $pyVersionOutput"

# ---------------------------------------------------------------------
# 2. Verify the wheelhouse exists, then install with --no-index
# ---------------------------------------------------------------------
if (-not (Test-Path "vendor\python") -or -not (Get-ChildItem "vendor\python\*.whl" -ErrorAction SilentlyContinue)) {
    Fail "vendor\python\ is missing or empty. This isn't a valid offline release bundle -- see docs\airgap.md."
}

Info "Creating virtual environment (.venv\)..."
python -m venv .venv
Ok ".venv\ created"

Info "Installing Python dependencies from vendor\python\ (--no-index: no network access used)..."
& .\.venv\Scripts\pip.exe install --no-index --find-links vendor\python -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    Fail "Offline install failed. This usually means vendor\python\ doesn't have a wheel for this machine's exact platform/Python version. See 'Targeting a different platform' in docs\airgap.md."
}
Ok "Python dependencies installed"

# ---------------------------------------------------------------------
# 3. Frontend: use the pre-built static export if present, else try an
#    offline rebuild if Node is available.
# ---------------------------------------------------------------------
if ((Test-Path "frontend\out") -and (Get-ChildItem "frontend\out" -ErrorAction SilentlyContinue)) {
    Ok "Pre-built frontend found at frontend\out\ -- no Node.js needed."
} else {
    WarnMsg "frontend\out\ not found. Attempting an offline rebuild..."
    $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
    if (-not $nodeCmd) {
        Fail "Node.js not found and no pre-built frontend\out\ is present. Install Node 18+ and re-run, or copy a pre-built frontend\out\ onto this machine from the release bundle."
    }

    if ((Test-Path "frontend\node_modules") -and (Get-ChildItem "frontend\node_modules" -ErrorAction SilentlyContinue)) {
        Ok "frontend\node_modules\ already present, using as-is."
    } elseif (Test-Path "vendor\npm\node_modules.tar.gz") {
        Info "Extracting vendored node_modules from vendor\npm\node_modules.tar.gz..."
        New-Item -ItemType Directory -Force -Path "frontend" | Out-Null
        tar -xzf "vendor\npm\node_modules.tar.gz" -C "frontend"
        Ok "node_modules extracted"
    } else {
        Fail "No frontend\node_modules\ and no vendor\npm\node_modules.tar.gz. Cannot rebuild the frontend offline -- see 'Contents' in vendor\npm\README.md."
    }

    # Swap in the right native compiler for THIS machine if it's missing.
    $swcDir = "win32-x64-msvc"
    $neededSwc = "frontend\node_modules\next\node_modules\@next\swc-$swcDir"
    $vendoredSwc = "vendor\npm\swc-binaries\$swcDir"
    if (-not (Test-Path $neededSwc) -and (Test-Path $vendoredSwc)) {
        Info "Installing the native Next.js compiler for win32-x64..."
        New-Item -ItemType Directory -Force -Path $neededSwc | Out-Null
        Copy-Item -Path "$vendoredSwc\*" -Destination $neededSwc -Recurse -Force
        Ok "Native compiler installed"
    }

    Info "Building the frontend (offline)..."
    Push-Location frontend
    npm run build
    Pop-Location
    Ok "Frontend built to frontend\out\"
}

Write-Host ""
Write-Host "=================================================================="
Write-Host "  ConfigFoundry installed successfully." -ForegroundColor Green
Write-Host "=================================================================="
Write-Host "  Database migrations run automatically on first launch."
Write-Host ""
Write-Host "  Start it with:"
Write-Host "    .\run_offline.ps1"
Write-Host "  or directly:"
Write-Host "    .\.venv\Scripts\python.exe server.py"
Write-Host ""
Write-Host "  Then open http://localhost:8420/ -- the bootstrap Super Admin"
Write-Host "  credentials are printed to the console on first startup."
Write-Host "=================================================================="
