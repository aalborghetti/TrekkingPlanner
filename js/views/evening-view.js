/**
 * Evening Routine View Module
 * Evening safety checklist, stage-specific preparation, weather lookups, and personal notes.
 */

import { formatDuration } from '../models/pace-calculator.js';
import { formatFriendlyDate } from '../models/trek-schema.js';

export function renderEvening(container, trek, onUpdate) {
  if (!trek.stages || trek.stages.length === 0) {
    container.innerHTML = `
      <div class="wrap content-area">
        <div class="card empty-state">
          <p>Nessuna tappa configurata in questo viaggio.</p>
          <a href="#/tappe" class="btn btn-primary">Aggiungi una tappa</a>
        </div>
      </div>
    `;
    return;
  }

  // Retrieve current active stage for evening check from localStorage or default to 1
  const savedStageNum = parseInt(localStorage.getItem('trek-evening-stage') || '1', 10);
  let currentStageIndex = trek.stages.findIndex(s => s.stageNumber === savedStageNum);
  if (currentStageIndex === -1) currentStageIndex = 0;

  const currentStage = trek.stages[currentStageIndex];

  // Base evening template items
  const baseEveningItems = [
    { id: 'e01', text: 'Ho controllato meteo, temporali, vento e temperatura per domani.' },
    { id: 'e02', text: 'Ho verificato il bollettino di criticità della regione interessata.' },
    { id: 'e03', text: 'Ho cercato nuovi avvisi o chiusure sul sentiero.' },
    { id: 'e04', text: 'GPX della tappa e mappa offline sono disponibili sul dispositivo.' },
    { id: 'e05', text: 'Telefono e power bank sono carichi al 100%; modalità risparmio pronta.' },
    { id: 'e06', text: 'Ho verificato indirizzo, orari di check-in e recapito telefonico della prossima struttura.' },
    { id: 'e07', text: 'Ho stabilito quanta acqua portare e dove potrei rifornirmi.' },
    { id: 'e08', text: 'Ho preparato pranzo compatto e scorta energetica per la giornata.' },
    { id: 'e09', text: 'Abbigliamento, scarpe asciutte e antipioggia sono pronti in cima allo zaino.' },
    { id: 'e10', text: 'Ho controllato i piedi, vesciche e applicato cerotti o creme di medicazione.' },
    { id: 'e11', text: 'Ho fissato l’orario di partenza con ampio margine prima del tramonto.' },
    { id: 'e12', text: 'Ho individuato almeno un punto di rinuncia o rientro (Piano B, bus/battelli).' },
    { id: 'e13', text: 'Una persona di fiducia a casa conosce il mio itinerario e l’ora prevista di arrivo.' }
  ];

  // Initialize stage-specific evening state if not present
  if (!currentStage.eveningChecks) {
    currentStage.eveningChecks = {};
  }

  const destinationCity = currentStage.to || '';
  const weatherCitySlug = destinationCity.toLowerCase().replace(/[^a-z0-9]+/g, '+');
  const weatherUrl = `https://www.3bmeteo.com/meteo/${weatherCitySlug}`;

  const html = `
    <div class="view-header-strip">
      <div class="wrap">
        <h1>🌙 Check Serale & Preparazione</h1>
        <p class="lead">Routine serale prima di ogni tappa per partire in sicurezza e senza imprevisti.</p>
        
        <div class="stage-selector-card">
          <label for="select-evening-stage"><strong>Seleziona la tappa da preparare:</strong></label>
          <select id="select-evening-stage" class="stage-dropdown">
            ${trek.stages.map((s, idx) => `
              <option value="${idx}" ${idx === currentStageIndex ? 'selected' : ''}>
                Tappa ${s.stageNumber} · ${s.from} → ${s.to} (${formatFriendlyDate(s.date)})
              </option>
            `).join('')}
          </select>
        </div>
      </div>
    </div>

    <div class="wrap content-area">
      <!-- Stage Info Card -->
      <section class="card evening-stage-summary">
        <div class="ess-header">
          <span class="ess-badge">Tappa ${currentStage.stageNumber}</span>
          <h2>${escapeHtml(currentStage.from)} &nbsp;→&nbsp; ${escapeHtml(currentStage.to)}</h2>
        </div>
        
        <div class="ess-metrics">
          <span>📅 ${formatFriendlyDate(currentStage.date)}</span>
          <span>📏 ${currentStage.distanceKm} km</span>
          <span>⛰️ +${currentStage.elevationGainM} m</span>
          <span>⏱️ ≈ ${formatDuration(currentStage.estimatedDurationHours)}</span>
        </div>

        ${currentStage.accommodation?.name ? `
          <div class="ess-hotel">
            <b>🏨 Prossimo Alloggio:</b> ${escapeHtml(currentStage.accommodation.name)}
            ${currentStage.accommodation.phone ? `· <a href="tel:${currentStage.accommodation.phone}">📞 ${currentStage.accommodation.phone}</a>` : ''}
            ${currentStage.accommodation.checkInNotes ? `<br><small>ℹ️ ${escapeHtml(currentStage.accommodation.checkInNotes)}</small>` : ''}
          </div>
        ` : ''}

        <div class="actions-strip">
          <a href="${weatherUrl}" target="_blank" rel="noopener" class="btn btn-primary btn-sm">
            ☀️ Meteo a ${escapeHtml(currentStage.to)} ↗
          </a>
          <a href="https://mappe.protezionecivile.gov.it/it/mappe-rischi/bollettino-di-criticita/" target="_blank" rel="noopener" class="btn btn-outline btn-sm">
            ⚠️ Bollettino Criticità ↗
          </a>
          <a href="https://navigazionelaghi.it/avvisi/" target="_blank" rel="noopener" class="btn btn-outline btn-sm">
            🚢 Avvisi Battelli ↗
          </a>
        </div>
      </section>

      <!-- Checks List -->
      <section class="card">
        <div class="card-header-flex">
          <h2>Controlli di Sicurezza</h2>
          <button id="btn-reset-evening" class="btn btn-outline btn-sm">Azzera controlli</button>
        </div>
        
        <div class="evening-checks-list">
          ${baseEveningItems.map(item => {
            const isChecked = !!currentStage.eveningChecks[item.id];
            return `
              <label class="check-box-row">
                <input type="checkbox" data-id="${item.id}" ${isChecked ? 'checked' : ''}>
                <span class="${isChecked ? 'check-done' : ''}">${escapeHtml(item.text)}</span>
              </label>
            `;
          }).join('')}
        </div>
      </section>

      <!-- Evening Notes for Stage -->
      <section class="card">
        <h2>Note & Appunti per questa Tappa</h2>
        <textarea id="evening-notes-input" rows="4" placeholder="Orari di partenza, fontanelle da verificare, accordi con la struttura...">${escapeHtml(currentStage.eveningNotes || '')}</textarea>
        <p class="muted"><small>I controlli e le note vengono salvati automaticamente per ogni singola tappa.</small></p>
      </section>
    </div>
  `;

  container.innerHTML = html;

  // Handle stage dropdown change
  const selectStage = container.querySelector('#select-evening-stage');
  selectStage.addEventListener('change', (e) => {
    const newIdx = parseInt(e.target.value, 10);
    const newStage = trek.stages[newIdx];
    if (newStage) {
      localStorage.setItem('trek-evening-stage', newStage.stageNumber);
      renderEvening(container, trek, onUpdate);
    }
  });

  // Handle check changes
  container.querySelectorAll('input[type="checkbox"][data-id]').forEach(box => {
    box.addEventListener('change', () => {
      const id = box.dataset.id;
      if (!currentStage.eveningChecks) currentStage.eveningChecks = {};
      currentStage.eveningChecks[id] = box.checked;

      const span = box.closest('label').querySelector('span');
      span.classList.toggle('check-done', box.checked);

      onUpdate(trek, true); // debounced save
    });
  });

  // Handle evening notes input
  const notesInput = container.querySelector('#evening-notes-input');
  notesInput.addEventListener('input', () => {
    currentStage.eveningNotes = notesInput.value;
    onUpdate(trek, true);
  });

  // Reset checks for this stage
  container.querySelector('#btn-reset-evening')?.addEventListener('click', () => {
    if (confirm('Azzerare i controlli di questa tappa?')) {
      currentStage.eveningChecks = {};
      onUpdate(trek);
      renderEvening(container, trek, onUpdate);
    }
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

