# Getting Started with BareTrack

Get from zero to your first scored session in about 5 minutes.

## Install the App

### Windows

1. Download **BareTrack** from the [latest release](https://github.com/kennedym-ds/barebow_project/releases/latest).
2. Run the installer and follow the prompts.
3. Launch BareTrack from the Start Menu.

### Android

1. Download the APK from the [latest release](https://github.com/kennedym-ds/barebow_project/releases/latest).
2. Enable "Install from unknown sources" in your device settings.
3. Open the APK to install.

Your data is stored locally on-device. Nothing is sent to the cloud.

> **Upgrading from the old Python/pywebview version?** Your database is imported automatically on first launch.

## 1. Set Up Your Equipment

Before logging your first session, add your bow and arrows.

1. Click **Equipment** in the sidebar.
2. Under **Bows**, click **Add Bow** and fill in:
   - Name (e.g. "My Riser + Limbs")
   - Draw weight
   - Brace height
   - Any other specs you know — all fields are optional except the name
3. Click **Save**.
4. Under **Arrows**, click **Add Arrow** and fill in:
   - Make and model
   - Spine, length, total weight, point weight
   - GPP and FOC calculate automatically when you have bow draw weight and arrow weights
5. Click **Save**.

That's it for setup. You can always come back and add more detail later.

## 2. Log Your First Session

1. Click **Session Logger** in the sidebar.
2. Pick a **round preset** from the dropdown (e.g. "WA 18m (Indoor)" for a standard 18m round on a 40 cm face).
   - Distance, face size, number of ends, and arrows per end fill in automatically.
3. Select your **bow** and **arrow** setup.
4. Click on the target face to place each arrow where it landed. The score calculates from the coordinates.
5. When you've placed all arrows for the end, click **Save End**.
6. Repeat for each end. When done, click **Finish Session**.

Your session is now saved and visible in **History** and **Analytics**.

## 3. View Your Results

- **History** — See the full scorecard, replay the session end-by-end, or export to CSV.
- **Analytics** — Score trends, precision metrics, personal bests, and more (builds up over multiple sessions).
- **Analysis Lab** — Park Model analysis, score predictions, and per-arrow heatmaps.
- **Help** — In-app guide explaining every page, key archery concepts, and contact info.

> **Tip:** Click the theme toggle in the sidebar footer to switch between Light, Dark, and System themes.

## 4. Optional: Crawl Marks (String-Walking)

If you shoot barebow with string-walking:

1. Go to **Crawl Manager** in the sidebar.
2. Enter 3 or more known crawl marks (distance + mark position pairs).
3. BareTrack fits a polynomial curve and predicts marks for any distance between 5–60 m.
4. Upload a photo of your tab to overlay the marks visually.

## What Next?

- Read the [User Guide](user-guide.md) for a full walkthrough of every feature.
- Check the [FEATURES.md](../FEATURES.md) for the complete feature checklist.

---

## Development Setup

Want to run from source or contribute? See below.

### Prerequisites

- **Node.js 18+** — [Download](https://nodejs.org/)
- **Rust** — [Install](https://rustup.rs/) (for Tauri builds)
- **Git** — [Download](https://git-scm.com/downloads)

For Android builds, you also need: Android SDK, NDK 27, JDK 21.

### Clone and Install

```bash
git clone https://github.com/kennedym-ds/barebow_project.git
cd barebow_project/frontend
npm install
```

### Run in Browser (Dev Mode)

```bash
cd frontend
npm run dev
```

Open **http://localhost:5173**. The app runs with an in-memory database (no persistence).

### Run as Desktop App (Tauri)

```bash
cd frontend
npx tauri dev
```

### Build for Production

**Windows desktop:**
```bash
cd frontend
npx tauri build
```

**Android APK:**
```bash
cd frontend
npx tauri android build --debug --target aarch64
```

### Troubleshooting

#### "'node' is not recognized"

Add Node.js to your system PATH. On Windows PowerShell (run as administrator):

```powershell
[Environment]::SetEnvironmentVariable("Path", "$env:Path;C:\Program Files\nodejs", "User")
```

Restart your terminal after changing PATH.

#### Database reset

Delete the database file from your Tauri AppData directory and relaunch the app — a fresh database is created automatically.
