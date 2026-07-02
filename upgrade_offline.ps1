<#
.SYNOPSIS
    Upgrade an existing ConfigFoundry install to a new release, using
    ONLY the new release's vendored dependencies. No network access used
    or required.

.DESCRIPTION
    Run this from the ROOT OF THE NEW RELEASE (i.e. after extracting
    ConfigFoundry-Offline-vX.Y.Z.zip somewhere and cd-ing into it).
    Mirrors upgrade_offline.sh exactly -- see that file's header comment
    and docs/upgrade.md for the full pre/post upgrade checklist.

.PARAMETER DbFrom
    Path to the OLD install's db\configfoundry.db to carry forward.

.EXAMPLE
    .\upgrade_offline.ps1 -DbFrom C:\ConfigFoundry-old\db\configfoundry.db
#>

param(
    [string]$DbFrom = ""
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $RepoRoot

function Info($msg) { Write-Host "==> $msg" -ForegroundColor Cyan }
function Ok($msg)   { Write-Host "[OK] $msg" -ForegroundColor Green }
function Fail($msg) { Write-Host "[FAIL] $msg" -ForegroundColor Red; exit 1 }

Write-Host "=================================================================="
Write-Host "  ConfigFoundry -- offline upgrade (Windows)"
Write-Host "=================================================================="
Write-Host ""

if ($DbFrom -ne "") {
    if (-not (Test-Path $DbFrom)) { Fail "Database not found at: $DbFrom" }
    New-Item -ItemType Directory -Force -Path "db" | Out-Null
    $ts = Get-Date -Format "yyyyMMdd-HHmmss"
    $backup = "db\configfoundry.db.pre-upgrade-$ts.bak"
    Info "Backing up $DbFrom -> $backup"
    Copy-Item $DbFrom $backup
    Ok "Backup written (original left untouched at $DbFrom)"

    Info "Copying database into this release's db\ directory..."
    Copy-Item $DbFrom "db\configfoundry.db" -Force
    Ok "db\configfoundry.db ready"
} else {
    Write-Host "  (no -DbFrom given -- starting with a fresh database; pass"
    Write-Host "   -DbFrom C:\path\to\old\db\configfoundry.db to carry data forward)"
}
Write-Host ""

Info "Installing this release's dependencies (offline)..."
& .\install_offline.ps1
Write-Host ""

Write-Host "=================================================================="
Write-Host "  Upgrade prepared." -ForegroundColor Green
Write-Host "=================================================================="
Write-Host "  Nothing has been migrated yet -- ConfigFoundry always applies"
Write-Host "  pending schema migrations automatically on startup, the same as"
Write-Host "  any normal boot. Start the upgraded app with:"
Write-Host "    .\run_offline.ps1"
Write-Host "  and watch the startup log for the migration summary. See"
Write-Host "  docs\upgrade.md for the pre/post upgrade checklist."
Write-Host "=================================================================="
