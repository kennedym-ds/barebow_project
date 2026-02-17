import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import './styles/mobile.css'
import { initDatabase } from './db/database'

/**
 * On Android, env(safe-area-inset-top) often returns 0 inside WebViews.
 * Detect the status bar height and set a CSS var.
 */
function applyAndroidSafeArea() {
  if (!/android/i.test(navigator.userAgent)) return
  const statusBarHeight = Math.max(36, screen.height - window.innerHeight > 100 ? 48 : 36)
  document.documentElement.style.setProperty('--safe-area-top', `${statusBarHeight}px`)
}

/**
 * Wait for Tauri 2's __TAURI_INTERNALS__ to appear on window.
 * On Android the injection can be async, so we poll briefly.
 */
function waitForTauri(timeoutMs = 3000): Promise<boolean> {
  if ('__TAURI_INTERNALS__' in window) return Promise.resolve(true)
  return new Promise(resolve => {
    const start = Date.now()
    const check = () => {
      if ('__TAURI_INTERNALS__' in window) return resolve(true)
      if (Date.now() - start > timeoutMs) return resolve(false)
      setTimeout(check, 50)
    }
    check()
  })
}

async function bootstrap() {
  const hasTauri = await waitForTauri()

  try {
    if (hasTauri) {
      // Dynamic import to avoid bundling Tauri FS in browser builds
      const { loadDatabaseFile, saveDatabaseFile } = await import('./db/tauriPersistence')
      const existingData = await loadDatabaseFile()
      await initDatabase({
        existingData: existingData ?? undefined,
        onSave: saveDatabaseFile,
        saveDebounceMs: 1000,
      })
    } else {
      // Browser mode (dev) - in-memory database, no persistence
      await initDatabase()
    }
  } catch (err) {
    console.error('Database initialization failed:', err)
    try {
      // Fallback to in-memory DB so pages can still function
      await initDatabase()
      console.warn('Fell back to in-memory database after initialization failure')
    } catch (fallbackErr) {
      console.error('Fallback database initialization failed:', fallbackErr)
    }
  }

  applyAndroidSafeArea()

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}

void bootstrap()
