<#
.SYNOPSIS
    Build the BareTrack Windows installer.
.DESCRIPTION
    1. Runs build-desktop.ps1 to produce dist/BareTrack/
    2. Compiles the Inno Setup script to produce dist/BareTrackSetup.exe
.NOTES
    Run from the project root:  .\scripts\build-installer.ps1
    Requires: Inno Setup 6 (iscc.exe on PATH, or installed to default location)
#>

param(
    [switch]$SkipApp,
    [switch]$Clean
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot

Push-Location $projectRoot
try {
    # ------------------------------------------------------------------
    # 1. Build the PyInstaller app (unless skipped)
    # ------------------------------------------------------------------
    if (-not $SkipApp) {
        $buildArgs = @()
        if ($Clean) { $buildArgs += "-Clean" }
        & "$PSScriptRoot\build-desktop.ps1" @buildArgs
    } else {
        Write-Host '[installer] Skipping app build (-SkipApp).' -ForegroundColor Yellow
        if (-not (Test-Path 'dist\BareTrack\BareTrack.exe')) {
            Write-Error 'dist\BareTrack\BareTrack.exe not found. Run build-desktop.ps1 first.'
        }
    }

    # ------------------------------------------------------------------
    # 2. Find Inno Setup compiler (iscc.exe)
    # ------------------------------------------------------------------
    $iscc = Get-Command iscc.exe -ErrorAction SilentlyContinue |
            Select-Object -ExpandProperty Source -First 1

    if (-not $iscc) {
        # Check common install locations
        $candidates = @(
            "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
            "$env:ProgramFiles\Inno Setup 6\ISCC.exe",
            "${env:ProgramFiles(x86)}\Inno Setup 5\ISCC.exe"
        )
        foreach ($c in $candidates) {
            if (Test-Path $c) { $iscc = $c; break }
        }
    }

    if (-not $iscc) {
        Write-Error @"
Inno Setup compiler (iscc.exe) not found.
Install Inno Setup 6 from: https://jrsoftware.org/isdl.php
Or add its install directory to your PATH.
"@
    }

    Write-Host "[installer] Using Inno Setup: $iscc" -ForegroundColor Cyan

    # ------------------------------------------------------------------
    # 3. Compile the installer
    # ------------------------------------------------------------------
    Write-Host '[installer] Compiling installer...' -ForegroundColor Cyan
    & $iscc "installer\baretrack.iss"

    if ($LASTEXITCODE -ne 0) {
        Write-Error 'Inno Setup compilation failed.'
    }

    if (-not (Test-Path 'dist\BareTrackSetup.exe')) {
        Write-Error 'Expected output dist\BareTrackSetup.exe not found.'
    }

    $size = (Get-Item 'dist\BareTrackSetup.exe').Length / 1MB
    Write-Host "[installer] Installer ready: dist\BareTrackSetup.exe ($([math]::Round($size, 1)) MB)" -ForegroundColor Green
}
finally {
    Pop-Location
}
