/**
 * Dashboard View Module
 * High-level trek overview, overall metrics, pace configuration, and quick actions.
 */

import { calculateTrekTotals, formatDuration } from '../models/pace-calculator.js';
import { formatFriendlyDate } from '../models/trek-schema.js';

export function renderDashboard(container, trek, onUpdate) {
  const totals = calculateTrekTotals(trek.stages, trek.meta?.paceConfig);
  const stagesCount = trek.stages?.length || 0;
  
  // Calculate checklist progress
  const backpackTotal = trek.checklists?.backpack?.length || 0;
  const backpackChecked = trek.checklists?.backpack?.filter(i => i.checked).length || 0;
  const backpackPct = backpackTotal > 0 ? Math.round((backpackChecked / backpackTotal) * 100) : 0;

  const html = `
    <div class="dashboard-hero">
      <div class="wrap">
        <div class="eyebrow-badge">
          <span>Trekking Itinerante</span>
          <span class="dot">·</span>
          <span>${stagesCount} Tappe</span>
        </div>
        <h1 class="trek-title">${escapeHtml(trek.meta.title)}</h1>
        <p class="trek-desc">${escapeHtml(trek.meta.description || 'Pianificazione itinerario a piedi.')}</p>
        
        <div class="trek-dates">
          <svg class="ui-icon" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <span>${formatFriendlyDate(trek.meta.startDate)} &nbsp;→&nbsp; ${formatFriendlyDate(trek.meta.endDate)}</span>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <span class="stat-icon">📏</span>
            <div class="stat-content">
              <strong>${totals.totalKm.toLocaleString('it-IT')} km</strong>
              <span>Distanza totale</span>
            </div>
          </div>
          <div class="stat-card">
            <span class="stat-icon">⛰️</span>
            <div class="stat-content">
              <strong>+${totals.totalGainM.toLocaleString('it-IT')} m</strong>
              <span>Dislivello positivo (D+)</span>
            </div>
          </div>
          <div class="stat-card">
            <span class="stat-icon">⏱️</span>
            <div class="stat-content">
              <strong>${totals.formattedHours}</strong>
              <span>Tempo netto stimato</span>
            </div>
          </div>
          <div class="stat-card">
            <span class="stat-icon">🎒</span>
            <div class="stat-content">
              <strong>${backpackChecked}/${backpackTotal}</strong>
              <span>Zaino pronto (${backpackPct}%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="wrap content-area">
      <div class="quick-nav-grid">
        <a href="#/tappe" class="quick-card">
          <div class="qc-icon">🥾</div>
          <div class="qc-info">
            <h3>Le Tappe</h3>
            <p>Programma giornaliero con tappe, alberghi e orari</p>
          </div>
          <span class="qc-arrow">→</span>
        </a>

        <a href="#/mappa" class="quick-card">
          <div class="qc-icon">🗺️</div>
          <div class="qc-info">
            <h3>Mappa & GPX</h3>
            <p>Tracce interattive, profili altimetrici e GPS offline</p>
          </div>
          <span class="qc-arrow">→</span>
        </a>

        <a href="#/materiale" class="quick-card">
          <div class="qc-icon">🎒</div>
          <div class="qc-info">
            <h3>Zaino & Peso</h3>
            <p>Checklist 40L, calcolo peso acqua e alimentazione</p>
          </div>
          <span class="qc-arrow">→</span>
        </a>

        <a href="#/check-serale" class="quick-card">
          <div class="qc-icon">🌙</div>
          <div class="qc-info">
            <h3>Check Serale</h3>
            <p>Controlli pre-tappa per meteo, dispositivi e piano B</p>
          </div>
          <span class="qc-arrow">→</span>
        </a>
      </div>

      <!-- Pace Configurator Card -->
      <section class="card pace-card">
        <div class="card-header-flex">
          <div>
            <h2>⏱️ Calcolo Passo & Ritmo di Marcia</h2>
            <p class="muted">Regola i parametri di velocità per ricalcolare automaticamente i tempi di tutte le tappe.</p>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button id="btn-edit-trek-meta" class="btn btn-outline btn-sm">✏️ Modifica Info</button>
            <a href="#/impostazioni" class="btn btn-sm" style="background:#fff2f0;color:#cf1322;border:1px solid #ffccc7;text-decoration:none;">🗑️ Elimina / Gestisci</a>
          </div>
        </div>
        <div class="pace-inputs-grid">
          <div class="form-group">
            <label for="pace-flat">Velocità in piano (km/h)</label>
            <input type="number" id="pace-flat" min="2.0" max="6.5" step="0.1" value="${trek.meta?.paceConfig?.flatKmH || 4.5}">
            <small>Media escursionistica standard: 4.0 - 4.5 km/h</small>
          </div>
          <div class="form-group">
            <label for="pace-elev">Salita oraria (m D+/ora)</label>
            <input type="number" id="pace-elev" min="200" max="800" step="25" value="${trek.meta?.paceConfig?.elevUpMH || 450}">
            <small>Media con zaino carico: 350 - 450 m/h</small>
          </div>
        </div>
      </section>

      <!-- Stages Summary Preview -->
      <section class="card stages-preview-card">
        <div class="card-header-flex">
          <h2>Itinerario Sintetico</h2>
          <a href="#/tappe" class="btn btn-outline btn-sm">Vedi Dettagli Tappe →</a>
        </div>
        <div class="timeline-preview">
          ${(trek.stages || []).map(s => `
            <div class="timeline-item">
              <div class="tl-num">${s.stageNumber}</div>
              <div class="tl-main">
                <div class="tl-route">${escapeHtml(s.from)} &nbsp;→&nbsp; ${escapeHtml(s.to)}</div>
                <div class="tl-sub">${formatFriendlyDate(s.date)} &nbsp;·&nbsp; ${escapeHtml(s.accommodation?.name || 'Alloggio')}</div>
              </div>
              <div class="tl-stats">
                <span class="badge badge-km">${s.distanceKm} km</span>
                <span class="badge badge-dplus">+${s.elevationGainM}m</span>
                <span class="badge badge-time">≈ ${formatDuration(s.estimatedDurationHours)}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </section>
    </div>

    <!-- Edit Trek Metadata Modal -->
    <div id="modal-edit-meta" class="modal-backdrop hidden">
      <div class="modal-box">
        <div class="modal-header">
          <h3>Modifica Informazioni Viaggio</h3>
          <button class="modal-close" id="btn-close-modal">✕</button>
        </div>
        <form id="form-edit-meta">
          <div class="form-group">
            <label for="meta-title">Titolo Viaggio</label>
            <input type="text" id="meta-title" value="${escapeHtml(trek.meta.title)}" required>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="meta-start">Data Inizio</label>
              <input type="date" id="meta-start" value="${trek.meta.startDate || ''}" required>
            </div>
            <div class="form-group">
              <label for="meta-end">Data Fine</label>
              <input type="date" id="meta-end" value="${trek.meta.endDate || ''}" required>
            </div>
          </div>
          <div class="form-group">
            <label for="meta-desc">Descrizione / Note generali</label>
            <textarea id="meta-desc" rows="3">${escapeHtml(trek.meta.description || '')}</textarea>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-outline" id="btn-cancel-modal">Annulla</button>
            <button type="submit" class="btn btn-primary">Salva Modifiche</button>
          </div>
        </form>
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Pace configuration listeners
  const flatInput = container.querySelector('#pace-flat');
  const elevInput = container.querySelector('#pace-elev');

  function updatePace() {
    const flat = parseFloat(flatInput.value) || 4.5;
    const elev = parseFloat(elevInput.value) || 450;
    
    trek.meta.paceConfig = { flatKmH: flat, elevUpMH: elev };
    
    // Recalculate estimated duration for stages that don't have custom override
    trek.stages.forEach(s => {
      const flatH = (Number(s.distanceKm) || 0) / flat;
      const climbH = (Number(s.elevationGainM) || 0) / elev;
      s.estimatedDurationHours = Math.round((flatH + climbH) * 4) / 4;
    });

    onUpdate(trek);
    renderDashboard(container, trek, onUpdate);
  }

  flatInput.addEventListener('change', updatePace);
  elevInput.addEventListener('change', updatePace);

  // Edit Meta Modal Handlers
  const modal = container.querySelector('#modal-edit-meta');
  const btnEditMeta = container.querySelector('#btn-edit-trek-meta');
  const btnCloseModal = container.querySelector('#btn-close-modal');
  const btnCancelModal = container.querySelector('#btn-cancel-modal');
  const formEditMeta = container.querySelector('#form-edit-meta');

  btnEditMeta.addEventListener('click', () => modal.classList.remove('hidden'));
  const closeModal = () => modal.classList.add('hidden');
  btnCloseModal.addEventListener('click', closeModal);
  btnCancelModal.addEventListener('click', closeModal);

  formEditMeta.addEventListener('submit', (e) => {
    e.preventDefault();
    trek.meta.title = container.querySelector('#meta-title').value.trim();
    trek.meta.startDate = container.querySelector('#meta-start').value;
    trek.meta.endDate = container.querySelector('#meta-end').value;
    trek.meta.description = container.querySelector('#meta-desc').value.trim();
    
    closeModal();
    onUpdate(trek);
    renderDashboard(container, trek, onUpdate);
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

