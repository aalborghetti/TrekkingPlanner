/**
 * TrekkingPlanner - Main SPA Entry Point & Client-side Router
 * Local-First, Offline-First PWA architecture.
 */

import { initDB, getActiveTrek, saveTrek, debouncedSave } from './db.js';
import { renderDashboard } from './views/dashboard-view.js';
import { renderStages } from './views/stages-view.js';
import { renderMap } from './views/map-view.js';
import { renderChecklist } from './views/checklist-view.js';
import { renderEvening } from './views/evening-view.js';
import { renderServices } from './views/services-view.js';
import { renderSettings } from './views/settings-view.js';

let activeTrek = null;
const container = document.getElementById('app-main-content');
const saveIndicator = document.getElementById('save-indicator');

// Parse route and query params from location.hash
function parseHash() {
  const hash = location.hash.slice(1) || '/';
  const [routePath, queryString] = hash.split('?');
  const queryParams = {};
  
  if (queryString) {
    new URLSearchParams(queryString).forEach((val, key) => {
      queryParams[key] = val;
    });
  }
  
  return { path: routePath, queryParams };
}

// Global update handler passed to all views
function handleTrekUpdate(updatedTrek, isDebounced = false) {
  activeTrek = updatedTrek;
  if (isDebounced) {
    debouncedSave(activeTrek);
  } else {
    saveTrek(activeTrek).catch(err => {
      console.error('[App] Save error:', err);
    });
  }
}

// Router dispatcher
async function router() {
  if (!activeTrek) {
    try {
      activeTrek = await getActiveTrek();
    } catch (e) {
      console.error('[App] Error retrieving active trek:', e);
    }
  }

  if (!activeTrek) {
    container.innerHTML = `<div class="wrap content-area"><div class="card"><p>Inizializzazione database in corso...</p></div></div>`;
    return;
  }

  // Update Header title
  const headerTitle = document.getElementById('header-trek-name');
  if (headerTitle) {
    headerTitle.textContent = activeTrek.meta.title;
  }

  const { path, queryParams } = parseHash();

  // Update active nav styling
  document.querySelectorAll('.nav-link, .bottom-nav-item').forEach(link => {
    const href = link.getAttribute('href') || '';
    const linkPath = href.replace('#', '').split('?')[0] || '/';
    const currentNorm = path === '' ? '/' : path;
    const isCurrent = (linkPath === currentNorm) || (linkPath === '/' && currentNorm === '');
    link.classList.toggle('active', isCurrent);
  });

  // Scroll to top on view change (unless on map)
  if (path !== '/mappa') {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  // Render matching view
  switch (path) {
    case '/':
    case '':
      renderDashboard(container, activeTrek, handleTrekUpdate);
      break;
    case '/tappe':
      renderStages(container, activeTrek, handleTrekUpdate);
      break;
    case '/mappa':
      renderMap(container, activeTrek, handleTrekUpdate, queryParams);
      break;
    case '/materiale':
      renderChecklist(container, activeTrek, handleTrekUpdate);
      break;
    case '/check-serale':
      renderEvening(container, activeTrek, handleTrekUpdate);
      break;
    case '/servizi':
      renderServices(container, activeTrek);
      break;
    case '/impostazioni':
      renderSettings(container, activeTrek, handleTrekUpdate);
      break;
    default:
      renderDashboard(container, activeTrek, handleTrekUpdate);
      break;
  }
}

// Listen for hash changes
window.addEventListener('hashchange', router);

// Save status indicator events
window.addEventListener('trek-saving', () => {
  if (saveIndicator) {
    saveIndicator.textContent = 'Salvataggio...';
    saveIndicator.classList.add('saving');
    saveIndicator.classList.remove('saved');
  }
});

window.addEventListener('trek-saved', () => {
  if (saveIndicator) {
    saveIndicator.textContent = 'Salvato ✓';
    saveIndicator.classList.remove('saving');
    saveIndicator.classList.add('saved');
    setTimeout(() => {
      saveIndicator.classList.remove('saved');
    }, 1200);
  }
});

// App Startup Initialization
async function initApp() {
  console.log('[App] Starting TrekkingPlanner SPA...');

  // 1. Storage persistence request
  if (navigator.storage && navigator.storage.persist) {
    try {
      const persisted = await navigator.storage.persist();
      console.log('[Storage] Storage persist status:', persisted);
    } catch (e) {
      console.warn('[Storage] Error requesting persist:', e);
    }
  }

  // 2. Service Worker registration (offline cache-first shell)
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    try {
      const reg = await navigator.serviceWorker.register('sw.js');
      console.log('[SW] ServiceWorker registered with scope:', reg.scope);
    } catch (err) {
      console.warn('[SW] Registration failed:', err);
    }
  }

  // 3. Initialize DB and load active trek
  await initDB();
  activeTrek = await getActiveTrek();

  // 4. Initial route render
  router();
}

initApp().catch(err => {
  console.error('[App] Critical initialization failure:', err);
  if (container) {
    container.innerHTML = `
      <div class="wrap content-area">
        <div class="card error-card">
          <h2>Errore di avvio</h2>
          <p>${err.message}</p>
          <button class="btn btn-primary" onclick="location.reload()">Riprova</button>
        </div>
      </div>
    `;
  }
});

