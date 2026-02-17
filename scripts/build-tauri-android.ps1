<#
.SYNOPSIS
    Build BareTrack Android APK/AAB via Tauri 2.0
.DESCRIPTION
    Produces debug or release APK using Tauri's Android target.
    Output: frontend/src-tauri/gen/android/app/build/outputs/
.NOTES
    Run from the project root: .\scripts\build-tauri-android.ps1
    Requires: Rust + Android targets, Android SDK/NDK, Node.js, Tauri CLI
#>

param(
    [switch]$Debug,
    [switch]$Release
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot

Push-Location $projectRoot
try {
    # Environment setup
    if (-not $env:JAVA_HOME) {
        $env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
    }
    if (-not $env:ANDROID_HOME) {
        $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
    }
    # Find NDK
    if (-not $env:NDK_HOME) {
        $ndkDir = Get-ChildItem "$env:ANDROID_HOME\ndk" -Directory -ErrorAction SilentlyContinue |
                  Sort-Object Name -Descending | Select-Object -First 1
        if ($ndkDir) {
            $env:NDK_HOME = $ndkDir.FullName
        } else {
            Write-Error "NDK not found. Install via: sdkmanager 'ndk;27.2.12479018'"
        }
    }

    # Ensure tools on PATH
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        $env:PATH = "C:\Program Files\nodejs;$env:PATH"
    }
    if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
        $env:PATH = "$env:USERPROFILE\.cargo\bin;$env:PATH"
    }

    Write-Host "[tauri-android] JAVA_HOME=$env:JAVA_HOME" -ForegroundColor DarkGray
    Write-Host "[tauri-android] ANDROID_HOME=$env:ANDROID_HOME" -ForegroundColor DarkGray
    Write-Host "[tauri-android] NDK_HOME=$env:NDK_HOME" -ForegroundColor DarkGray

    Push-Location frontend

    # Install deps if needed
    if (-not (Test-Path "node_modules")) {
        Write-Host '[tauri-android] Installing npm dependencies...' -ForegroundColor Cyan
        npm ci
    }

    if ($Release) {
        Write-Host '[tauri-android] Building release APK...' -ForegroundColor Cyan
        npx tauri android build
    } else {
        Write-Host '[tauri-android] Building debug APK...' -ForegroundColor Cyan
        npx tauri android build --debug
    }

    Pop-Location

    # Report output
    $apkDir = "frontend/src-tauri/gen/android/app/build/outputs/apk"
    if (Test-Path $apkDir) {
        Write-Host '[tauri-android] Build complete! APKs:' -ForegroundColor Green
        Get-ChildItem -Recurse $apkDir -Include "*.apk" | ForEach-Object {
            $sizeMB = [math]::Round($_.Length / 1MB, 1)
            Write-Host "  $($_.FullName) ($sizeMB MB)" -ForegroundColor Cyan
        }
    }
}
finally {
    Pop-Location
}
