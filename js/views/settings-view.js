/**
 * Settings & Backup View Module
 * Export/Import JSON engine (iOS Files/iCloud Drive compatible), multi-trek management,
 * default template restoration, and IndexedDB storage health inspection.
 */

import { 
  exportTrekJSON, 
  importTrekJSON, 
  getAllTreks, 
  setActiveTrekId, 
  deleteTrek, 
  resetToGarda2026, 
  getStorageStatus,
  saveTrek
} from '../db.js';
import { createNewTrek } from '../models/trek-schema.js';

export async function renderSettings(container, currentTrek, onUpdate) {
  const allTreks = await getAllTreks();
  const storageInfo = await getStorageStatus();
  const swActive = !!navigator.serviceWorker?.controller;

  const html = `
    <div class="view-header-strip">
      <div class="wrap">
        <h1>⚙️ Impostazioni & Backup Dati</h1>
        <p class="lead">Gestione Local-First: esporta, importa e salva i tuoi trekking senza dipendere dal cloud.</p>
      </div>
    </div>

    <div class="wrap content-area">
      <!-- Prominent Delete Current Trek Card -->
      <section class="card" style="border: 1.5px solid #ff7875; background: #fff2f0; margin-bottom: 20px;">
        <div class="card-header-flex">
          <div>
            <h2 style="color: #cf1322; margin: 0 0 4px;">🗑️ Elimina Questo Viaggio</h2>
            <p style="margin: 0; color: #5c0011; font-size: 14px;">
              Vuoi cancellare il percorso corrente <strong>"${escapeHtml(currentTrek.meta.title)}"</strong> e ripartire da zero con un itinerario pulito?
            </p>
          </div>
          <button id="btn-delete-active-trek" class="btn btn-sm" style="background:#ff4d4f;color:#fff;border:none;font-weight:800;padding:8px 14px;border-radius:6px;cursor:pointer;white-space:nowrap;">
            🗑️ Elimina e Riparti da Zero
          </button>
        </div>
      </section>

      <!-- Export & Import JSON Card -->
      <section class="card">
        <h2>💾 Backup Universale (File JSON)</h2>
        <p class="muted">L'intero stato dell'itinerario (tappe, tracce GPX, alloggi, liste dello zaino e controlli serali) è racchiuso in un unico file compatto compatibile con iOS File, iCloud Drive e qualsiasi dispositivo.</p>
        
        <div class="settings-actions-grid">
          <div class="action-box">
            <h3>📥 Esporta Viaggio Corrente</h3>
            <p>Salva una copia completa di <strong>"${escapeHtml(currentTrek.meta.title)}"</strong> in formato <code>.json</code>.</p>
            <button id="btn-export-json" class="btn btn-primary">Scarica File JSON</button>
          </div>

          <div class="action-box">
            <h3>📤 Importa Viaggio</h3>
            <p>Carica un file trekking precedentemente esportato o condiviso.</p>
            <label for="input-import-json" class="btn btn-outline" style="cursor:pointer;display:inline-block">
              Seleziona File .json
            </label>
            <input type="file" id="input-import-json" accept=".json,application/json" class="hidden">
          </div>
        </div>
      </section>

      <!-- Multi-Trek Management -->
      <section class="card">
        <div class="card-header-flex">
          <h2>I Miei Trekking (${allTreks.length})</h2>
          <button id="btn-new-trek" class="btn btn-primary btn-sm">+ Crea Nuovo Viaggio</button>
        </div>

        <div class="treks-list">
          ${allTreks.map(t => {
            const isActive = t.id === currentTrek.meta.id;
            return `
              <div class="trek-item-row ${isActive ? 'active-trek' : ''}">
                <div class="tir-info">
                  <strong>${escapeHtml(t.title)}</strong>
                  <span class="muted">${t.startDate || 'Data non impostata'} · ${t.stagesCount} tappe</span>
                  ${isActive ? '<span class="tag tag-success">Attivo</span>' : ''}
                </div>
                <div class="tir-actions">
                  ${!isActive ? `<button class="btn btn-outline btn-sm btn-switch-trek" data-id="${t.id}">Attiva</button>` : ''}
                  <button class="btn btn-sm btn-delete-trek" data-id="${t.id}" style="background:#ff4d4f;color:#fff;border:none;font-weight:700;padding:5px 12px;border-radius:4px;cursor:pointer;">🗑️ Elimina</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </section>

      <!-- Reset & Template Restore -->
      <section class="card">
        <h2>🔄 Ripristino Modelli Predefiniti</h2>
        <p class="muted">Puoi ripristinare in qualsiasi momento l'itinerario originale del Grande Giro del Garda 2026 completo di tutte le 9 tracce GPX, dettagli degli alloggi e materiale.</p>
        <button id="btn-restore-garda" class="btn btn-outline btn-sm">Ripristina Giro del Garda 2026</button>
      </section>

      <!-- Storage & PWA Diagnostics -->
      <section class="card">
        <h2>📱 Diagnostica Storage & Offline PWA</h2>
        <div class="diagnostics-grid">
          <div class="diag-item">
            <span class="diag-label">Storage Persistente (IndexedDB):</span>
            <span class="diag-val ${storageInfo.persisted ? 'color-success' : 'color-warn'}">
              ${storageInfo.persisted ? '✓ Attivo (protetto da pulizia automatica)' : 'Standard'}
            </span>
          </div>
          <div class="diag-item">
            <span class="diag-label">Memoria locale utilizzata:</span>
            <span class="diag-val">${storageInfo.usageMb} MB / ${storageInfo.quotaMb} MB</span>
          </div>
          <div class="diag-item">
            <span class="diag-label">Service Worker Offline:</span>
            <span class="diag-val ${swActive ? 'color-success' : 'color-warn'}">
              ${swActive ? '✓ Attivo (cache-first)' : 'In registrazione...'}
            </span>
          </div>
          <div class="diag-item">
            <span class="diag-label">Versione Schema:</span>
            <span class="diag-val">v${currentTrek.version || '1.0'}</span>
          </div>
        </div>
      </section>
    </div>

    <!-- New Trek Modal -->
    <div id="modal-new-trek" class="modal-backdrop hidden">
      <div class="modal-box">
        <div class="modal-header">
          <h3>Crea Nuovo Viaggio</h3>
          <button class="modal-close" id="btn-close-new-trek">✕</button>
        </div>
        <form id="form-new-trek">
          <div class="form-group">
            <label for="new-trek-title">Nome del Viaggio</label>
            <input type="text" id="new-trek-title" placeholder="es. Alta Via delle Dolomiti n.1" required>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="new-trek-start">Data di Inizio</label>
              <input type="date" id="new-trek-start" required>
            </div>
            <div class="form-group">
              <label for="new-trek-end">Data di Fine</label>
              <input type="date" id="new-trek-end" required>
            </div>
          </div>
          <div class="form-group">
            <label for="new-trek-desc">Descrizione</label>
            <textarea id="new-trek-desc" rows="2" placeholder="Note generali e caratteristiche del trek..."></textarea>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-outline" id="btn-cancel-new-trek">Annulla</button>
            <button type="submit" class="btn btn-primary">Crea Viaggio</button>
          </div>
        </form>
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Export JSON
  container.querySelector('#btn-export-json')?.addEventListener('click', () => {
    exportTrekJSON(currentTrek);
  });

  // Import JSON
  const importInput = container.querySelector('#input-import-json');
  importInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const imported = await importTrekJSON(text);
      alert(`Viaggio "${imported.meta.title}" importato con successo!`);
      location.hash = '#/';
      location.reload();
    } catch (err) {
      alert('Errore importazione file: ' + err.message);
    }
  });

  // Switch Trek
  container.querySelectorAll('.btn-switch-trek').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      await setActiveTrekId(id);
      location.hash = '#/';
      location.reload();
    });
  });

  // Delete Active Trek
  container.querySelector('#btn-delete-active-trek')?.addEventListener('click', async () => {
    if (confirm(`Confermi di voler eliminare definitivamente "${currentTrek.meta.title}" dalla memoria del dispositivo?\n\nVerrà creato un nuovo viaggio vuoto pronto da personalizzare.`)) {
      await deleteTrek(currentTrek.meta.id);
      location.hash = '#/';
      location.reload();
    }
  });

  // Delete Trek from list
  container.querySelectorAll('.btn-delete-trek').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      if (confirm('Sei sicuro di voler eliminare definitivamente questo viaggio?')) {
        await deleteTrek(id);
        location.reload();
      }
    });
  });

  // Restore Garda 2026
  container.querySelector('#btn-restore-garda')?.addEventListener('click', async () => {
    if (confirm('Ripristinare i dati predefiniti del Grande Giro del Garda 2026? Se sono state fatte modifiche su quel viaggio verranno sovrascritte.')) {
      await resetToGarda2026();
      alert('Grande Giro del Garda 2026 ripristinato con successo!');
      location.hash = '#/';
      location.reload();
    }
  });

  // New Trek Modal
  const modalNew = container.querySelector('#modal-new-trek');
  const btnNewTrek = container.querySelector('#btn-new-trek');
  const btnCloseNew = container.querySelector('#btn-close-new-trek');
  const btnCancelNew = container.querySelector('#btn-cancel-new-trek');
  const formNew = container.querySelector('#form-new-trek');

  const today = new Date().toISOString().slice(0, 10);
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  container.querySelector('#new-trek-start').value = today;
  container.querySelector('#new-trek-end').value = nextWeek;

  const closeNewModal = () => modalNew.classList.add('hidden');
  btnNewTrek?.addEventListener('click', () => modalNew.classList.remove('hidden'));
  btnCloseNew?.addEventListener('click', closeNewModal);
  btnCancelNew?.addEventListener('click', closeNewModal);

  formNew?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = container.querySelector('#new-trek-title').value.trim();
    const start = container.querySelector('#new-trek-start').value;
    const end = container.querySelector('#new-trek-end').value;
    const desc = container.querySelector('#new-trek-desc').value.trim();

    const created = createNewTrek({ title, startDate: start, endDate: end, description: desc });
    await saveTrek(created);
    await setActiveTrekId(created.meta.id);

    closeNewModal();
    alert(`Nuovo viaggio "${title}" creato!`);
    location.hash = '#/';
    location.reload();
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

