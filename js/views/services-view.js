/**
 * Services View Module
 * Route-agnostic services directory dynamically generated for all stage endpoints.
 */

export function renderServices(container, trek) {
  // Extract unique towns from stages (both from and to)
  const towns = [];
  (trek.stages || []).forEach(s => {
    if (s.to && !towns.includes(s.to)) towns.push(s.to);
    if (s.from && !towns.includes(s.from)) towns.push(s.from);
  });

  const html = `
    <div class="view-header-strip">
      <div class="wrap">
        <h1>🛠️ Servizi Utili & Riferimenti</h1>
        <p class="lead">Ricerche rapide nei paesi attraversati dal percorso: farmacie, alimentari, acqua e appoggi.</p>
        
        <div class="emergency-banner card">
          <div class="eb-item">
            <strong>📞 112</strong>
            <span>Numero Unico Europeo per Emergenze e Soccorso Alpino</span>
          </div>
          <div class="eb-item">
            <strong>🥾 CNSAS</strong>
            <span>Soccorso Alpino e Speleologico (tramite 112)</span>
          </div>
          <div class="eb-item">
            <strong>🚢 1530</strong>
            <span>Guardia Costiera / Emergenze in Acqua</span>
          </div>
        </div>
      </div>
    </div>

    <div class="wrap content-area">
      <div class="notice-box card">
        <b>💧 Punti d'Acqua & Rifornimento:</b>
        <p>Le fontanelle in montagna o nei piccoli borghi possono variare disponibilità in base alla stagione e alla siccità. Riempi sempre le borracce presso la struttura prima di partire e considera bar o alimentari come riserva sicura.</p>
      </div>

      <h2>Paesi e Punti Tappa (${towns.length})</h2>
      <div class="towns-grid">
        ${towns.map(town => {
          const q = encodeURIComponent(town);
          return `
            <div class="town-card card">
              <h3>📍 ${escapeHtml(town)}</h3>
              <div class="town-actions-grid">
                <a href="https://www.google.com/maps/search/farmacia+${q}" target="_blank" rel="noopener" class="btn btn-outline btn-sm">
                  💊 Farmacie ↗
                </a>
                <a href="https://www.google.com/maps/search/supermercato+alimentari+${q}" target="_blank" rel="noopener" class="btn btn-outline btn-sm">
                  🛒 Alimentari ↗
                </a>
                <a href="https://www.google.com/maps/search/ristorante+pizzeria+${q}" target="_blank" rel="noopener" class="btn btn-outline btn-sm">
                  🍽️ Mangiare ↗
                </a>
                <a href="https://www.google.com/maps/search/fontanella+acqua+potabile+${q}" target="_blank" rel="noopener" class="btn btn-outline btn-sm">
                  💧 Fontanelle ↗
                </a>
                <a href="https://www.google.com/maps/search/fermata+autobus+stazione+${q}" target="_blank" rel="noopener" class="btn btn-outline btn-sm">
                  🚌 Trasporti ↗
                </a>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  container.innerHTML = html;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

