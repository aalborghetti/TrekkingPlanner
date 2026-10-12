/**
 * Checklist & Gear View Module
 * Manages backpack checklist, dynamic weight computation, 40L pack volume distribution, and stage hydration needs.
 */

export function renderChecklist(container, trek, onUpdate) {
  if (!trek.checklists) trek.checklists = {};
  if (!Array.isArray(trek.checklists.backpack)) trek.checklists.backpack = [];
  if (!trek.meta.packConfig) {
    trek.meta.packConfig = { baseWeightKg: 7.2, waterLiters: 2.0, foodKg: 0.7 };
  }

  const items = trek.checklists.backpack;
  const totalItems = items.length;
  const checkedCount = items.filter(i => i.checked).length;
  const pct = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;

  const baseWeight = Number(trek.meta.packConfig.baseWeightKg) || 7.2;
  const waterLiters = Number(trek.meta.packConfig.waterLiters) || 2.0;
  const foodKg = Number(trek.meta.packConfig.foodKg) || 0.7;
  const totalWeight = (baseWeight + waterLiters + foodKg).toFixed(1).replace('.', ',');

  // Extract unique categories
  const categories = Array.from(new Set(items.map(i => i.category || 'Altro')));
  if (!categories.includes('Indossato')) categories.unshift('Indossato');

  const html = `
    <div class="view-header-strip">
      <div class="wrap">
        <h1>Materiale & Zaino</h1>
        <p class="lead">Checklist interattiva per trekking con pernottamento in struttura e zaino da 35–40L.</p>
        
        <div class="weight-dashboard">
          <div class="wd-card">
            <span class="wd-title">Progresso Preparazione</span>
            <strong id="progress-text">${checkedCount} / ${totalItems}</strong>
            <div class="progress-bar-wrap">
              <div class="progress-fill" id="progress-bar" style="width: ${pct}%"></div>
            </div>
            <small>${pct}% elementi controllati</small>
          </div>

          <div class="wd-card">
            <span class="wd-title">Peso Base Stimato</span>
            <strong>${baseWeight.toFixed(1).replace('.', ',')} kg</strong>
            <small>Zaino, abiti e attrezzatura</small>
          </div>

          <div class="wd-card">
            <span class="wd-title">Peso Totale con Consumabili</span>
            <strong id="total-weight-display">${totalWeight} kg</strong>
            <small>Inclusi ${waterLiters}L acqua e ${foodKg}kg cibo</small>
          </div>
        </div>
      </div>
    </div>

    <div class="wrap content-area">
      <!-- Weight Config Controls -->
      <div class="pack-controls-bar">
        <div class="control-field">
          <label for="select-water">💧 Acqua iniziale:</label>
          <select id="select-water">
            <option value="1.0" ${waterLiters === 1.0 ? 'selected' : ''}>1,0 L (leggero)</option>
            <option value="1.5" ${waterLiters === 1.5 ? 'selected' : ''}>1,5 L</option>
            <option value="2.0" ${waterLiters === 2.0 ? 'selected' : ''}>2,0 L (standard)</option>
            <option value="2.5" ${waterLiters === 2.5 ? 'selected' : ''}>2,5 L</option>
            <option value="3.0" ${waterLiters === 3.0 ? 'selected' : ''}>3,0 L (tappe calde/lunghe)</option>
          </select>
        </div>

        <div class="control-field">
          <label for="input-food">🥪 Cibo & Snack:</label>
          <input type="number" id="input-food" min="0.2" max="2.5" step="0.1" value="${foodKg}" style="width:75px"> kg
        </div>

        <div class="control-field">
          <label for="input-base-weight">🎒 Peso base:</label>
          <input type="number" id="input-base-weight" min="4.0" max="15.0" step="0.1" value="${baseWeight}" style="width:75px"> kg
        </div>

        <button id="btn-reset-checklist" class="btn btn-outline btn-sm">Azzera Checklist</button>
        <button onclick="window.print()" class="btn btn-outline btn-sm">🖨️ Stampa</button>
      </div>

      <!-- Add custom item strip -->
      <form id="form-add-item" class="add-item-form card">
        <h4>+ Aggiungi materiale alla lista</h4>
        <div class="add-item-row">
          <input type="text" id="new-item-text" placeholder="Nome dell'oggetto (es. Cerotti compeed, coltellino)" required>
          <select id="new-item-cat">
            ${categories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}
            <option value="Nuova Categoria">+ Nuova Categoria...</option>
          </select>
          <button type="submit" class="btn btn-primary btn-sm">Aggiungi</button>
        </div>
      </form>

      <!-- Categorized Checklist Items -->
      <div class="checklist-categories-list">
        ${categories.map(category => {
          const categoryItems = items.filter(i => (i.category || 'Altro') === category);
          if (categoryItems.length === 0) return '';
          const catChecked = categoryItems.filter(i => i.checked).length;

          return `
            <details class="category-block card" open>
              <summary class="cat-summary">
                <span class="cat-title">${escapeHtml(category)}</span>
                <span class="cat-counter">${catChecked} / ${categoryItems.length}</span>
              </summary>
              <div class="items-grid">
                ${categoryItems.map(item => `
                  <div class="checklist-item-row">
                    <label class="item-label">
                      <input type="checkbox" data-id="${item.id}" ${item.checked ? 'checked' : ''}>
                      <span class="${item.checked ? 'item-checked' : ''}">${escapeHtml(item.item)}</span>
                    </label>
                    <button class="btn-delete-item" data-id="${item.id}" title="Elimina elemento">✕</button>
                  </div>
                `).join('')}
              </div>
            </details>
          `;
        }).join('')}
      </div>

      <!-- Packing Distribution Guide -->
      <section class="card pack-distribution-guide">
        <h2>🎒 Come distribuire i 40 litri</h2>
        <div class="pack-zones-grid">
          <div class="zone-box">
            <h3>Fondo · 8–10 L</h3>
            <p>Abiti puliti e da notte in sacca stagna, ciabatte e asciugamano. Materiale usato solo all'arrivo nella struttura.</p>
          </div>
          <div class="zone-box">
            <h3>Centro vicino alla schiena</h3>
            <p>Acqua, cibo più pesante, beauty case compatto e power bank. Mantieni qui il baricentro del peso.</p>
          </div>
          <div class="zone-box">
            <h3>Centro esterno</h3>
            <p>Pile, giacca termica e sacca degli indumenti sporchi o umidi in fase di asciugatura.</p>
          </div>
          <div class="zone-box">
            <h3>Parte superiore</h3>
            <p>Guscio antipioggia, sovrapantaloni, guanti e kit primo soccorso: devono uscire istantaneamente.</p>
          </div>
          <div class="zone-box">
            <h3>Cintura e spallacci</h3>
            <p>Smartphone, barrette energetiche, crema solare, fazzoletti e piccoli oggetti da usare durante la marcia.</p>
          </div>
          <div class="zone-box">
            <h3>Esterno</h3>
            <p>Solo i bastoncini telescopici ben allacciati. Evita calzature penzolanti o sacchetti esterni oscillanti.</p>
          </div>
        </div>
      </section>

      <!-- Stage Hydration Guide -->
      <section class="card hydration-guide">
        <h2>💧 Fabbisogno Idrico Indicativo</h2>
        <table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Tappa</th>
              <th>Distanza</th>
              <th>Salita D+</th>
              <th>Acqua consigliata</th>
            </tr>
          </thead>
          <tbody>
            ${(trek.stages || []).map(s => `
              <tr>
                <td><strong>${s.stageNumber}</strong></td>
                <td>${escapeHtml(s.from)} → ${escapeHtml(s.to)}</td>
                <td>${s.distanceKm} km</td>
                <td>+${s.elevationGainM} m</td>
                <td><strong>${s.distanceKm > 24 || s.elevationGainM > 800 ? '2,0 – 2,5 L' : '1,5 – 2,0 L'}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </section>
    </div>
  `;

  container.innerHTML = html;

  // Checkbox toggle listener
  container.querySelectorAll('input[type="checkbox"][data-id]').forEach(box => {
    box.addEventListener('change', (e) => {
      const id = box.dataset.id;
      const item = items.find(i => i.id === id);
      if (item) {
        item.checked = box.checked;
        const textSpan = box.closest('label').querySelector('span');
        textSpan.classList.toggle('item-checked', box.checked);
        
        // Update stats
        const currentChecked = items.filter(i => i.checked).length;
        const currentPct = Math.round((currentChecked / totalItems) * 100);
        container.querySelector('#progress-text').textContent = `${currentChecked} / ${totalItems}`;
        container.querySelector('#progress-bar').style.width = `${currentPct}%`;

        onUpdate(trek, true); // debounced save
      }
    });
  });

  // Delete item
  container.querySelectorAll('.btn-delete-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = btn.dataset.id;
      const idx = items.findIndex(i => i.id === id);
      if (idx !== -1) {
        items.splice(idx, 1);
        onUpdate(trek);
        renderChecklist(container, trek, onUpdate);
      }
    });
  });

  // Weight controls
  const waterSelect = container.querySelector('#select-water');
  const foodInput = container.querySelector('#input-food');
  const baseInput = container.querySelector('#input-base-weight');

  function updateWeights() {
    trek.meta.packConfig.waterLiters = parseFloat(waterSelect.value) || 2.0;
    trek.meta.packConfig.foodKg = parseFloat(foodInput.value) || 0.7;
    trek.meta.packConfig.baseWeightKg = parseFloat(baseInput.value) || 7.2;

    const newTotal = (trek.meta.packConfig.baseWeightKg + trek.meta.packConfig.waterLiters + trek.meta.packConfig.foodKg).toFixed(1).replace('.', ',');
    container.querySelector('#total-weight-display').textContent = `${newTotal} kg`;

    onUpdate(trek, true);
  }

  waterSelect.addEventListener('change', updateWeights);
  foodInput.addEventListener('input', updateWeights);
  baseInput.addEventListener('input', updateWeights);

  // Add Item Form
  const formAdd = container.querySelector('#form-add-item');
  formAdd.addEventListener('submit', (e) => {
    e.preventDefault();
    const textInput = container.querySelector('#new-item-text');
    const catSelect = container.querySelector('#new-item-cat');

    let category = catSelect.value;
    if (category === 'Nuova Categoria') {
      const customCat = prompt('Inserisci il nome della nuova categoria:');
      if (!customCat || !customCat.trim()) return;
      category = customCat.trim();
    }

    const newItem = {
      id: 'b_' + Date.now().toString(36),
      category: category,
      item: textInput.value.trim(),
      checked: false
    };

    items.push(newItem);
    onUpdate(trek);
    renderChecklist(container, trek, onUpdate);
  });

  // Reset checklist
  container.querySelector('#btn-reset-checklist')?.addEventListener('click', () => {
    if (confirm('Azzerare tutti i controlli della checklist materiale?')) {
      items.forEach(i => i.checked = false);
      onUpdate(trek);
      renderChecklist(container, trek, onUpdate);
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

