; BareTrack Inno Setup Script
; Produces: BareTrackSetup.exe
;
; Prerequisites:
;   1. Build the app first:  .\scripts\build-desktop.ps1
;   2. Install Inno Setup 6:  https://jrsoftware.org/isinfo.php
;   3. Compile:  iscc installer\baretrack.iss
;      Or open in Inno Setup GUI and click Build → Compile.

#define MyAppName "BareTrack"
#define MyAppVersion "1.0.2"
#define MyAppPublisher "BareTrack"
#define MyAppURL "https://github.com/kennedym-ds/barebow_project"
#define MyAppExeName "BareTrack.exe"

[Setup]
AppId={{B4R3-TR4CK-D3SK-T0P1}}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
; Allow user-level install (no admin required)
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
OutputDir=..\dist
OutputBaseFilename=BareTrackSetup
SetupIconFile=..\assets\baretrack.ico
UninstallDisplayIcon={app}\{#MyAppExeName}
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
; Show license if you add a LICENSE.txt later
; LicenseFile=..\LICENSE.txt

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
; Bundle the entire PyInstaller output folder
Source: "..\dist\BareTrack\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

; Bundle WebView2 bootstrapper if present (see installer\README.md)
#if FileExists("MicrosoftEdgeWebview2Setup.exe")
Source: "MicrosoftEdgeWebview2Setup.exe"; DestDir: "{tmp}"; Flags: ignoreversion dontcopy
#define HaveWebView2Bootstrapper
#endif

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\Uninstall {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
; Install WebView2 if not already present and bootstrapper was bundled
#ifdef HaveWebView2Bootstrapper
Filename: "{tmp}\MicrosoftEdgeWebview2Setup.exe"; Parameters: "/silent /install"; \
    StatusMsg: "Installing Microsoft Edge WebView2 Runtime..."; \
    Flags: waituntilterminated; Check: NeedWebView2
#endif

; Launch app after install
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; \
    Flags: nowait postinstall skipifsilent

[Code]
// Check if WebView2 runtime needs to be installed
function NeedWebView2: Boolean;
var
  RegValue: String;
begin
  Result := True;
  // WebView2 registers itself here on install
  if RegQueryStringValue(HKLM, 
    'SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}',
    'pv', RegValue) then
  begin
    if RegValue <> '' then
      Result := False;
  end;
  if Result then
  begin
    if RegQueryStringValue(HKCU,
      'SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}',
      'pv', RegValue) then
    begin
      if RegValue <> '' then
        Result := False;
    end;
  end;
end;
