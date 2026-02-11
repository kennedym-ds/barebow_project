<#
.SYNOPSIS
    Build the BareTrack desktop application.
.DESCRIPTION
    1. Builds the React frontend with Vite
    2. Runs PyInstaller to produce dist/BareTrack/
.NOTES
    Run from the project root:  .\scripts\build-desktop.ps1
#>

param(
    [switch]$SkipFrontend,
    [switch]$Clean
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot

Push-Location $projectRoot
try {
    # ------------------------------------------------------------------
    # 0. Clean previous build
    # ------------------------------------------------------------------
    if ($Clean) {
        Write-Host "[build] Cleaning previous build artifacts..." -ForegroundColor Yellow
        Remove-Item -Recurse -Force -ErrorAction SilentlyContinue build, dist
    }

    # ------------------------------------------------------------------
    # 1. Build frontend
    # ------------------------------------------------------------------
    if (-not $SkipFrontend) {
        Write-Host "[build] Building React frontend..." -ForegroundColor Cyan
        Push-Location frontend
        npm ci
        npm run build
        Pop-Location

        if (-not (Test-Path "frontend/dist/index.html")) {
            Write-Error "Frontend build failed — frontend/dist/index.html not found."
        }
        Write-Host "[build] Frontend build complete." -ForegroundColor Green
    } else {
        Write-Host "[build] Skipping frontend build (--SkipFrontend)." -ForegroundColor Yellow
    }

    # ------------------------------------------------------------------
    # 2. Run PyInstaller
    # ------------------------------------------------------------------
    Write-Host "[build] Running PyInstaller..." -ForegroundColor Cyan
    python -m PyInstaller baretrack.spec --noconfirm

    if (-not (Test-Path "dist/BareTrack/BareTrack.exe")) {
        Write-Error "PyInstaller build failed — dist/BareTrack/BareTrack.exe not found."
    }

    $size = (Get-ChildItem -Recurse "dist/BareTrack" | Measure-Object -Sum Length).Sum / 1MB
    Write-Host "[build] Build complete!  dist/BareTrack/  ($([math]::Round($size, 1)) MB)" -ForegroundColor Green
    Write-Host "[build] Launch with:  .\dist\BareTrack\BareTrack.exe" -ForegroundColor Cyan
}
finally {
    Pop-Location
}
