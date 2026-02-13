# Installer

This folder contains the [Inno Setup](https://jrsoftware.org/isinfo.php) script
that packages `dist/BareTrack/` into a single `BareTrackSetup.exe` installer.

## Prerequisites

1. **Build the app** first:

   ```powershell
   .\scripts\build-desktop.ps1
   ```

2. **Install Inno Setup 6**: <https://jrsoftware.org/isdl.php>

## Build the Installer

### Option A — Command line

```powershell
.\scripts\build-installer.ps1
```

### Option B — Inno Setup GUI

Open `installer\baretrack.iss` in Inno Setup and click **Build → Compile**.

## Optional: Bundle WebView2 Runtime

Windows 10 (21H2+) and Windows 11 ship with WebView2 pre-installed. For older
systems, download the **Evergreen Bootstrapper** (~1.8 MB) and place it in this
folder:

1. Download from: <https://developer.microsoft.com/en-us/microsoft-edge/webview2/>
2. Save as `installer/MicrosoftEdgeWebview2Setup.exe`

The installer will automatically detect and install it if needed.

## Output

After building: `dist/BareTrackSetup.exe` — a single file you can distribute.
