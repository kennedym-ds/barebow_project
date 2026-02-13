# Getting Started with BareTrack

Get from zero to your first scored session in about 5 minutes.

## What You Need

- **Python 3.11+** — [Download](https://www.python.org/downloads/)
- **Node.js 18+** — [Download](https://nodejs.org/)
- **Git** — [Download](https://git-scm.com/downloads)

## 1. Clone and Set Up

```bash
git clone https://github.com/kennedym-ds/barebow_project.git
cd barebow_project
```

Create a Python virtual environment and install dependencies:

```bash
# Windows
python -m venv .venv
.venv\Scripts\activate

# macOS / Linux
python3 -m venv .venv
source .venv/bin/activate
```

```bash
pip install -r requirements.txt
```

Install the frontend:

```bash
cd frontend
npm install
cd ..
```

## 2. Start the App

Open two terminals in the project root:

**Terminal 1 — API server:**

```bash
uvicorn api.main:app --reload --port 8000
```

**Terminal 2 — Frontend dev server:**

```bash
cd frontend
npm run dev
```

Open **http://localhost:5173** in your browser.

> **VS Code users**: Run the `Dev: Start All` task (`Ctrl+Shift+B`) to launch both servers at once.

## 3. Set Up Your Equipment

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

## 4. Log Your First Session

1. Click **Session Logger** in the sidebar.
2. Pick a **round preset** from the dropdown (e.g. "WA 18m (Indoor)" for a standard 18m round on a 40 cm face).
   - Distance, face size, number of ends, and arrows per end fill in automatically.
3. Select your **bow** and **arrow** setup.
4. Click on the target face to place each arrow where it landed. The score calculates from the coordinates.
5. When you've placed all arrows for the end, click **Save End**.
6. Repeat for each end. When done, click **Finish Session**.

Your session is now saved and visible in **History** and **Analytics**.

## 5. View Your Results

- **History** — See the full scorecard, replay the session end-by-end, or export to CSV.
- **Analytics** — Score trends, precision metrics, personal bests, and more (builds up over multiple sessions).
- **Analysis Lab** — Park Model analysis, score predictions, and per-arrow heatmaps.
- **Help** — In-app guide explaining every page, key archery concepts, and contact info.

> **Tip:** Click the theme toggle in the sidebar footer to switch between Light, Dark, and System themes.

## 6. Optional: Load Sample Data

If you want to explore the app with realistic data before shooting:

```bash
python seed_data.py
```

This creates 6 sample WA 18m sessions with a bow and arrow setup. Refresh the browser to see the data.

## 7. Optional: Crawl Marks (String-Walking)

If you shoot barebow with string-walking:

1. Go to **Crawl Manager** in the sidebar.
2. Enter 3 or more known crawl marks (distance + mark position pairs).
3. BareTrack fits a polynomial curve and predicts marks for any distance between 5–60 m.
4. Upload a photo of your tab to overlay the marks visually.

## What Next?

- Read the [User Guide](user-guide.md) for a full walkthrough of every feature.
- Check the API docs at **http://localhost:8000/docs** (Swagger UI).
- Run the test suite with `python -m pytest` (120 tests) to verify everything works.

## Troubleshooting

### "Module not found" errors

Make sure your virtual environment is activated:

```bash
# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate
```

### "'node' is not recognized"

Add Node.js to your system PATH. On Windows PowerShell (run as administrator):

```powershell
[Environment]::SetEnvironmentVariable("Path", "$env:Path;C:\Program Files\nodejs", "User")
```

Restart your terminal after changing PATH.

### Port already in use

Kill the process on port 8000:

```bash
# Windows
Get-NetTCPConnection -LocalPort 8000 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }

# macOS / Linux
lsof -ti:8000 | xargs kill -9
```

### Database reset

Delete `baretrack.db` and restart the API — a fresh database is created automatically.
