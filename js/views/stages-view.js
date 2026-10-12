/**
 * Stages View Module
 * Full stage-by-stage itinerary management, accommodation details, live stage editor, and GPX attachments.
 */

import { calculateTrekTotals, calculateDurationHours, formatDuration } from '../models/pace-calculator.js';
import { formatFriendlyDate } from '../models/trek-schema.js';
import { parseGPX } from '../models/gpx-parser.js';

export function renderStages(container, trek, onUpdate) {
  const totals = calculateTrekTotals(trek.stages, trek.meta?.paceConfig);

  const html = `
    <div class="view-header-strip">
      <div class="wrap">
        <div class="header-strip-flex">
          <div>
            <h1>Itinerario & Tappe</h1>
            <p class="lead">Programma dettagliato del cammino con dislivelli, alloggi e tracce.</p>
          </div>
          <button id="btn-add-stage" class="btn btn-primary">+ Aggiungi Nuova Tappa</button>
        </div>
        <div class="totals-bar">
          <div class="total-pill"><strong>${totals.totalKm} km</strong> lunghezza totale</div>
          <div class="total-pill"><strong>+${totals.totalGainM} m</strong> dislivello D+</div>
          <div class="total-pill"><strong>${trek.stages.length}</strong> giornate di trekking</div>
        </div>
      </div>
    </div>

    <div class="wrap content-area">
      <div class="tools-bar">
        <button id="btn-expand-all" class="btn btn-outline btn-sm">Espandi Tutte</button>
        <button id="btn-collapse-all" class="btn btn-outline btn-sm">Comprimi Tutte</button>
        ${trek.stages.length > 0 ? `<button id="btn-clear-all-stages" class="btn btn-danger-outline btn-sm">🗑️ Svuota Tappe</button>` : ''}
        <button class="btn btn-outline btn-sm" onclick="window.print()">🖨️ Stampa Itinerario</button>
      </div>

      <div class="stages-container" id="stages-list">
        ${trek.stages.length === 0 ? `
          <div class="empty-state card">
            <p>Nessuna tappa presente in questo viaggio.</p>
            <button id="btn-add-first-stage" class="btn btn-primary">+ Aggiungi la prima tappa</button>
          </div>
        ` : trek.stages.map((stage, index) => renderStageItem(stage, index, trek)).join('')}
      </div>
    </div>

    <!-- Edit/Add Stage Modal -->
    <div id="modal-stage-editor" class="modal-backdrop hidden">
      <div class="modal-box modal-lg">
        <div class="modal-header">
          <h3 id="modal-stage-title">Modifica Tappa</h3>
          <button class="modal-close" id="btn-close-stage-modal">✕</button>
        </div>
        <form id="form-stage-editor">
          <input type="hidden" id="edit-stage-index" value="-1">
          
          <div class="form-row">
            <div class="form-group col-2">
              <label for="edit-stage-number">Numero Tappa</label>
              <input type="number" id="edit-stage-number" min="1" required>
            </div>
            <div class="form-group col-4">
              <label for="edit-stage-date">Data Tappa</label>
              <input type="date" id="edit-stage-date" required>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group col-3">
              <label for="edit-stage-from">Punto di Partenza</label>
              <input type="text" id="edit-stage-from" placeholder="es. Desenzano" required>
            </div>
            <div class="form-group col-3">
              <label for="edit-stage-to">Punto di Arrivo</label>
              <input type="text" id="edit-stage-to" placeholder="es. Peschiera del Garda" required>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group col-2">
              <label for="edit-stage-dist">Distanza (km)</label>
              <input type="number" id="edit-stage-dist" step="0.1" min="0" required>
            </div>
            <div class="form-group col-2">
              <label for="edit-stage-gain">Salita D+ (m)</label>
              <input type="number" id="edit-stage-gain" step="10" min="0" required>
            </div>
            <div class="form-group col-2">
              <label for="edit-stage-loss">Discesa D- (m)</label>
              <input type="number" id="edit-stage-loss" step="10" min="0" required>
            </div>
          </div>

          <div class="form-row align-end">
            <div class="form-group col-3">
              <label for="edit-stage-hours">Tempo stimato (ore decimali)</label>
              <input type="number" id="edit-stage-hours" step="0.25" min="0">
            </div>
            <div class="form-group col-3">
              <button type="button" id="btn-calc-stage-time" class="btn btn-outline" style="width:100%">⚡ Ricalcola da Passo</button>
            </div>
          </div>

          <hr class="form-divider">
          <h4>Pernottamento & Alloggio</h4>

          <div class="form-row">
            <div class="form-group col-3">
              <label for="edit-hotel-name">Nome Struttura</label>
              <input type="text" id="edit-hotel-name" placeholder="es. Rifugio o Hotel">
            </div>
            <div class="form-group col-3">
              <label for="edit-hotel-phone">Telefono</label>
              <input type="tel" id="edit-hotel-phone" placeholder="es. +39 045 8240950">
            </div>
          </div>

          <div class="form-group">
            <label for="edit-hotel-address">Indirizzo completo</label>
            <input type="text" id="edit-hotel-address" placeholder="Via, civico, comune">
          </div>

          <div class="form-group">
            <label for="edit-hotel-web">Sito web ufficiale o link prenotazione</label>
            <input type="url" id="edit-hotel-web" placeholder="https://...">
          </div>

          <div class="form-group">
            <label for="edit-hotel-notes">Note check-in / orari</label>
            <input type="text" id="edit-hotel-notes" placeholder="es. Codice portone, colazione 7:30, asciugamani inclusi">
          </div>

          <hr class="form-divider">
          <h4>Note sul percorso & Piano B</h4>

          <div class="form-group">
            <label for="edit-stage-notes">Descrizione & particolarità del percorso</label>
            <textarea id="edit-stage-notes" rows="2" placeholder="Fondo, punti d'acqua, deviazioni..."></textarea>
          </div>

          <div class="form-group">
            <label for="edit-stage-planb">Piano B & Rientri di emergenza (bus, battelli, tagli)</label>
            <textarea id="edit-stage-planb" rows="2" placeholder="Fermate autobus, battelli, scorciatoie..."></textarea>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-outline" id="btn-cancel-stage-modal">Annulla</button>
            <button type="submit" class="btn btn-primary">Salva Tappa</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Hidden file input for GPX upload per stage -->
    <input type="file" id="gpx-file-input" accept=".gpx" class="hidden">
  `;

  container.innerHTML = html;

  // Setup accordion toggle listeners
  const detailsList = container.querySelectorAll('details.stage-card');
  container.querySelector('#btn-expand-all')?.addEventListener('click', () => {
    detailsList.forEach(d => d.open = true);
  });
  container.querySelector('#btn-collapse-all')?.addEventListener('click', () => {
    detailsList.forEach(d => d.open = false);
  });
  container.querySelector('#btn-clear-all-stages')?.addEventListener('click', () => {
    if (confirm('Vuoi rimuovere tutte le tappe di questo itinerario per inserire il tuo nuovo percorso da zero?')) {
      trek.stages = [];
      onUpdate(trek);
      renderStages(container, trek, onUpdate);
    }
  });

  // Modal setup
  const modal = container.querySelector('#modal-stage-editor');
  const modalTitle = container.querySelector('#modal-stage-title');
  const form = container.querySelector('#form-stage-editor');
  const btnClose = container.querySelector('#btn-close-stage-modal');
  const btnCancel = container.querySelector('#btn-cancel-stage-modal');
  const gpxFileInput = container.querySelector('#gpx-file-input');

  let currentGpxStageIndex = -1;

  const closeModal = () => modal.classList.add('hidden');
  btnClose.addEventListener('click', closeModal);
  btnCancel.addEventListener('click', closeModal);

  // Add stage button
  const openAddStage = () => {
    modalTitle.textContent = 'Aggiungi Nuova Tappa';
    form.reset();
    container.querySelector('#edit-stage-index').value = '-1';
    
    // Auto-fill next stage number and next date
    const nextNum = trek.stages.length + 1;
    container.querySelector('#edit-stage-number').value = nextNum;
    
    if (trek.stages.length > 0) {
      const lastStage = trek.stages[trek.stages.length - 1];
      container.querySelector('#edit-stage-from').value = lastStage.to || '';
      if (lastStage.date) {
        const d = new Date(lastStage.date);
        d.setDate(d.getDate() + 1);
        container.querySelector('#edit-stage-date').value = d.toISOString().slice(0, 10);
      }
    } else {
      container.querySelector('#edit-stage-date').value = trek.meta.startDate || new Date().toISOString().slice(0, 10);
    }

    modal.classList.remove('hidden');
  };

  container.querySelector('#btn-add-stage')?.addEventListener('click', openAddStage);
  container.querySelector('#btn-add-first-stage')?.addEventListener('click', openAddStage);

  // Recalculate time button in modal
  container.querySelector('#btn-calc-stage-time')?.addEventListener('click', () => {
    const dist = parseFloat(container.querySelector('#edit-stage-dist').value) || 0;
    const gain = parseFloat(container.querySelector('#edit-stage-gain').value) || 0;
    const hours = calculateDurationHours(dist, gain, trek.meta?.paceConfig);
    container.querySelector('#edit-stage-hours').value = hours;
  });

  // Edit stage buttons
  container.querySelectorAll('.btn-edit-stage').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.index, 10);
      const stage = trek.stages[idx];
      if (!stage) return;

      modalTitle.textContent = `Modifica Tappa ${stage.stageNumber}`;
      container.querySelector('#edit-stage-index').value = idx;
      container.querySelector('#edit-stage-number').value = stage.stageNumber;
      container.querySelector('#edit-stage-date').value = stage.date || '';
      container.querySelector('#edit-stage-from').value = stage.from || '';
      container.querySelector('#edit-stage-to').value = stage.to || '';
      container.querySelector('#edit-stage-dist').value = stage.distanceKm || '';
      container.querySelector('#edit-stage-gain').value = stage.elevationGainM || '';
      container.querySelector('#edit-stage-loss').value = stage.elevationLossM || '';
      container.querySelector('#edit-stage-hours').value = stage.estimatedDurationHours || '';

      container.querySelector('#edit-hotel-name').value = stage.accommodation?.name || '';
      container.querySelector('#edit-hotel-phone').value = stage.accommodation?.phone || '';
      container.querySelector('#edit-hotel-address').value = stage.accommodation?.address || '';
      container.querySelector('#edit-hotel-web').value = stage.accommodation?.website || '';
      container.querySelector('#edit-hotel-notes').value = stage.accommodation?.checkInNotes || '';

      container.querySelector('#edit-stage-notes').value = stage.notes || '';
      container.querySelector('#edit-stage-planb').value = stage.planB || '';

      modal.classList.remove('hidden');
    });
  });

  // Delete stage buttons
  container.querySelectorAll('.btn-delete-stage').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.index, 10);
      const stage = trek.stages[idx];
      if (!stage) return;

      if (confirm(`Sei sicuro di voler eliminare la Tappa ${stage.stageNumber} (${stage.from} → ${stage.to})?`)) {
        trek.stages.splice(idx, 1);
        // Renumber stages
        trek.stages.forEach((s, i) => s.stageNumber = i + 1);
        onUpdate(trek);
        renderStages(container, trek, onUpdate);
      }
    });
  });

  // Attach GPX to stage buttons
  container.querySelectorAll('.btn-upload-gpx').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      currentGpxStageIndex = parseInt(btn.dataset.index, 10);
      gpxFileInput.value = '';
      gpxFileInput.click();
    });
  });

  gpxFileInput.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file || currentGpxStageIndex < 0) return;

    try {
      const text = await file.text();
      const parsed = parseGPX(text);
      const stage = trek.stages[currentGpxStageIndex];

      stage.trackGeoJSON = parsed.trackGeoJSON;
      if (confirm(`Traccia GPX letta con successo!\n- Distanza: ${parsed.distanceKm} km\n- Salita D+: +${parsed.elevationGainM} m\n\nVuoi aggiornare anche i valori di distanza e dislivello della tappa con quelli della traccia?`)) {
        stage.distanceKm = parsed.distanceKm;
        stage.elevationGainM = parsed.elevationGainM;
        stage.elevationLossM = parsed.elevationLossM;
        stage.estimatedDurationHours = calculateDurationHours(parsed.distanceKm, parsed.elevationGainM, trek.meta?.paceConfig);
      }

      onUpdate(trek);
      renderStages(container, trek, onUpdate);
      alert('Traccia GPX associata alla tappa con successo!');
    } catch (err) {
      alert('Errore nel caricamento del file GPX: ' + err.message);
    }
  });

  // Stage Form Submit
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const idx = parseInt(container.querySelector('#edit-stage-index').value, 10);

    const dist = parseFloat(container.querySelector('#edit-stage-dist').value) || 0;
    const gain = parseFloat(container.querySelector('#edit-stage-gain').value) || 0;
    const loss = parseFloat(container.querySelector('#edit-stage-loss').value) || 0;
    let hours = parseFloat(container.querySelector('#edit-stage-hours').value);
    if (isNaN(hours) || hours <= 0) {
      hours = calculateDurationHours(dist, gain, trek.meta?.paceConfig);
    }

    const stageData = {
      stageNumber: parseInt(container.querySelector('#edit-stage-number').value, 10) || (trek.stages.length + 1),
      date: container.querySelector('#edit-stage-date').value,
      from: container.querySelector('#edit-stage-from').value.trim(),
      to: container.querySelector('#edit-stage-to').value.trim(),
      distanceKm: dist,
      elevationGainM: gain,
      elevationLossM: loss,
      estimatedDurationHours: hours,
      notes: container.querySelector('#edit-stage-notes').value.trim(),
      planB: container.querySelector('#edit-stage-planb').value.trim(),
      accommodation: {
        name: container.querySelector('#edit-hotel-name').value.trim(),
        phone: container.querySelector('#edit-hotel-phone').value.trim(),
        address: container.querySelector('#edit-hotel-address').value.trim(),
        website: container.querySelector('#edit-hotel-web').value.trim(),
        checkInNotes: container.querySelector('#edit-hotel-notes').value.trim(),
        coordinates: idx >= 0 && trek.stages[idx]?.accommodation?.coordinates 
          ? trek.stages[idx].accommodation.coordinates 
          : null
      },
      trackGeoJSON: idx >= 0 ? (trek.stages[idx]?.trackGeoJSON || null) : null
    };

    if (idx >= 0) {
      trek.stages[idx] = stageData;
    } else {
      trek.stages.push(stageData);
    }

    // Sort stages by stageNumber
    trek.stages.sort((a, b) => a.stageNumber - b.stageNumber);

    closeModal();
    onUpdate(trek);
    renderStages(container, trek, onUpdate);
  });
}

function renderStageItem(stage, index, trek) {
  const hasTrack = !!stage.trackGeoJSON;
  const hotel = stage.accommodation || {};
  const mapsSearchUrl = hotel.name || hotel.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((hotel.name ? hotel.name + ' ' : '') + (hotel.address || ''))}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stage.to)}`;

  return `
    <details class="stage-card" id="stage-${stage.stageNumber}">
      <summary class="stage-summary">
        <div class="summary-left">
          <span class="stage-number-badge">${stage.stageNumber}</span>
          <div class="summary-headings">
            <span class="stage-title">${escapeHtml(stage.from)} &nbsp;→&nbsp; ${escapeHtml(stage.to)}</span>
            <span class="stage-date">${formatFriendlyDate(stage.date)}</span>
          </div>
        </div>
        <div class="summary-pills">
          <span class="badge badge-km">${stage.distanceKm} km</span>
          <span class="badge badge-dplus">+${stage.elevationGainM}m</span>
          <span class="badge badge-time">≈ ${formatDuration(stage.estimatedDurationHours)}</span>
        </div>
      </summary>

      <div class="stage-detail-body">
        <div class="stage-stats-row">
          <div class="stage-stat-box">
            <b>${stage.distanceKm} km</b>
            <span>Lunghezza</span>
          </div>
          <div class="stage-stat-box">
            <b>+${stage.elevationGainM} m</b>
            <span>Salita D+</span>
          </div>
          <div class="stage-stat-box">
            <b>-${stage.elevationLossM} m</b>
            <span>Discesa D-</span>
          </div>
          <div class="stage-stat-box">
            <b>≈ ${formatDuration(stage.estimatedDurationHours)}</b>
            <span>Cammino netto</span>
          </div>
        </div>

        <!-- Accommodation block -->
        ${hotel.name || hotel.address ? `
          <div class="stay-card">
            <div class="stay-header">
              <span class="stay-icon">🏨</span>
              <div>
                <strong>${escapeHtml(hotel.name || 'Pernottamento')}</strong>
                ${hotel.address ? `<span class="stay-address">${escapeHtml(hotel.address)}</span>` : ''}
              </div>
            </div>

            <div class="stay-links">
              ${hotel.phone ? `<a href="tel:${hotel.phone}" class="btn-link-action">📞 ${hotel.phone}</a>` : ''}
              ${hotel.website ? `<a href="${hotel.website}" target="_blank" rel="noopener" class="btn-link-action">🌐 Sito Web ↗</a>` : ''}
              <a href="${mapsSearchUrl}" target="_blank" rel="noopener" class="btn-link-action">🗺️ Apri su Mappa ↗</a>
            </div>

            ${hotel.checkInNotes ? `<div class="stay-notes"><small>ℹ️ ${escapeHtml(hotel.checkInNotes)}</small></div>` : ''}
          </div>
        ` : ''}

        <!-- Trail Notes & Plan B -->
        ${stage.notes ? `
          <div class="route-note">
            <b>Percorso:</b> ${escapeHtml(stage.notes)}
          </div>
        ` : ''}

        ${stage.planB ? `
          <div class="planb-box">
            <b>⚠️ Piano B e uscite di emergenza:</b>
            <p>${escapeHtml(stage.planB)}</p>
          </div>
        ` : ''}

        <!-- Track info & actions -->
        <div class="track-actions-bar">
          <div class="track-status">
            ${hasTrack 
              ? `<span class="tag tag-success">✓ Traccia GPX presente</span>` 
              : `<span class="tag tag-warn">Traccia GPX non presente</span>`}
          </div>

          <div class="action-buttons-group">
            ${hasTrack ? `<a href="#/mappa?stage=${stage.stageNumber}" class="btn btn-outline btn-sm">🗺️ Mostra su Mappa</a>` : ''}
            <button class="btn btn-outline btn-sm btn-upload-gpx" data-index="${index}">📁 ${hasTrack ? 'Sostituisci GPX' : 'Carica GPX'}</button>
            <button class="btn btn-outline btn-sm btn-edit-stage" data-index="${index}">✏️ Modifica</button>
            <button class="btn btn-danger-outline btn-sm btn-delete-stage" data-index="${index}">🗑️</button>
          </div>
        </div>
      </div>
    </details>
  `;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

