
// react-frontend/src/main.tsx
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Auto-reload when JS chunks can't be loaded after a new deploy
// (old hashed filenames no longer exist → server returns HTML 404 → MIME type error → white screen)
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const msg: string = reason?.message ?? '';
  const isChunkError =
    reason instanceof TypeError &&
    (msg.includes('dynamically imported module') ||
      msg.includes('Failed to fetch') ||
      msg.includes('Importing a module script failed'));

  if (isChunkError) {
    // Guard: only reload once per 15 seconds to avoid infinite loop
    const key = 'pr_chunk_reload_at';
    const last = Number(sessionStorage.getItem(key) || 0);
    if (Date.now() - last > 15_000) {
      sessionStorage.setItem(key, String(Date.now()));
      window.location.reload();
    }
  }
});

createRoot(document.getElementById("root")!).render(<App />);
