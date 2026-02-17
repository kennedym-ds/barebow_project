<#
.SYNOPSIS
    Build BareTrack desktop installer via Tauri 2.0
.DESCRIPTION
    Produces MSI and NSIS installers using Tauri's bundler.
    Output: frontend/src-tauri/target/release/bundle/
.NOTES
    Run from the project root: .\scripts\build-tauri-desktop.ps1
    Requires: Rust, Node.js, Tauri CLI
#>

param(
    [switch]$Clean,
    [switch]$Debug
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot

Push-Location $projectRoot
try {
    # Ensure Node.js is on PATH
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        $env:PATH = "C:\Program Files\nodejs;$env:PATH"
    }

    if ($Clean) {
        Write-Host '[tauri-desktop] Cleaning previous build...' -ForegroundColor Yellow
        if (Test-Path "frontend/src-tauri/target") {
            Remove-Item -Recurse -Force "frontend/src-tauri/target/release" -ErrorAction SilentlyContinue
        }
    }

    Push-Location frontend

    # Install deps if needed
    if (-not (Test-Path "node_modules")) {
        Write-Host '[tauri-desktop] Installing npm dependencies...' -ForegroundColor Cyan
        npm ci
    }

    Write-Host '[tauri-desktop] Building Tauri desktop app...' -ForegroundColor Cyan

    if ($Debug) {
        npx tauri build --debug
    } else {
        npx tauri build
    }

    Pop-Location

    # Report output
    $bundleDir = "frontend/src-tauri/target/release/bundle"
    if ($Debug) { $bundleDir = "frontend/src-tauri/target/debug/bundle" }

    if (Test-Path $bundleDir) {
        Write-Host '[tauri-desktop] Build complete! Installers:' -ForegroundColor Green
        Get-ChildItem -Recurse $bundleDir -Include "*.msi","*.exe" | ForEach-Object {
            $sizeMB = [math]::Round($_.Length / 1MB, 1)
            Write-Host "  $($_.FullName) ($sizeMB MB)" -ForegroundColor Cyan
        }
    } else {
        Write-Host "[tauri-desktop] Build output not found at $bundleDir" -ForegroundColor Red
    }
}
finally {
    Pop-Location
}
