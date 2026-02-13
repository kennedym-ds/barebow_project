# BareTrack Frontend

React + TypeScript frontend for the BareTrack archery tracking application.

## Tech Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite 6
- **Routing**: React Router v7
- **Data Fetching**: TanStack Query v5
- **Visualization**: Plotly.js
- **Styling**: CSS custom properties with dark mode support

## Getting Started

### Prerequisites

- Node.js 18+ (must be in system PATH)
- npm 9+

### Installation

```bash
npm install
```

### Development Server

Start the dev server on port 5173:

```bash
npm run dev
```

**Note**: If you encounter `"node" is not recognized` errors, ensure Node.js is in your system PATH:

```powershell
# Windows PowerShell (run as administrator)
[Environment]::SetEnvironmentVariable("Path", "$env:Path;C:\Program Files\nodejs", "User")
```

Then restart your terminal/editor.

### Build for Production

```bash
npm run build
```

Output goes to `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
src/
├── api/              # API client utilities
│   └── client.ts     # Generic fetch wrapper
├── components/       # Reusable components
│   ├── ErrorBoundary.tsx # Error boundary with retry
│   ├── Toast.tsx     # Toast notification system
│   ├── Layout.tsx    # Main layout with sidebar
│   └── NavSidebar.tsx # Navigation menu with tooltips & theme toggle
├── hooks/            # Custom React hooks
│   └── useTheme.ts   # Light/Dark/System theme management
├── pages/            # Route pages
│   ├── Home.tsx
│   ├── Help/
│   ├── EquipmentProfile/
│   ├── SessionLogger/
│   ├── Analytics/
│   └── ...
├── types/            # TypeScript interfaces
│   └── models.ts     # Domain models
├── App.tsx           # Root component with routing
├── main.tsx          # React entry point
└── index.css         # Global styles + dark mode CSS variables
```

## API Proxy

The Vite dev server proxies `/api/*` requests to `http://localhost:8000` (FastAPI backend).

Ensure the FastAPI backend is running before starting the frontend dev server.

## Routes

- `/` - Home dashboard
- `/equipment` - Equipment Profile (bows, arrows, tabs)
- `/analysis` - Analysis Lab (score predictions)
- `/session` - Session Logger (interactive scoring)
- `/history` - Session history
- `/crawls` - Crawl Manager (barebow sight marks)
- `/analytics` - Analytics dashboard
- `/tuning` - Tuning Wizard
- `/help` - Help (app guide, concepts, contact)

## Development

**Recent additions**: Dark mode (Light/Dark/System toggle), Help page, error boundary & toasts, responsive sidebar with hamburger menu, sidebar tooltips, per-arrow heatmaps with centroids, density heatmap toggle, arrow precision tiers (Primary/Secondary/Reserve), CSV export

### Adding a New Page

1. Create `src/pages/YourPage/index.tsx`
2. Add route in `src/App.tsx`
3. Add navigation link in `src/components/NavSidebar.tsx`

### API Integration

Use TanStack Query hooks:

```typescript
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../api/client';
import { BowSetup } from '../types/models';

function useBows() {
  return useQuery({
    queryKey: ['bows'],
    queryFn: () => apiFetch<BowSetup[]>('/api/bows'),
  });
}
```

## Contributing

Follow the TypeScript strict mode guidelines and ensure zero linting errors before committing.

## License

Proprietary - BareTrack Project
