/**
 * Map View Module
 * Interactive Leaflet map supporting offline rendering, multi-stage overlays,
 * accommodation markers, track zooming, and live GPX file loading.
 */

import { formatDuration } from '../models/pace-calculator.js';
import { parseGPX } from '../models/gpx-parser.js';

let mapInstance = null;
let currentLayerGroup = null;
let currentStageSelected = -1;

const STAGE_COLORS = [
  '#0074D9', '#2ECC40', '#FF851B', '#B10DC9', '#FF4136', 
  '#39CCCC', '#01FF70', '#85144b', '#F012BE', '#FFDC00'
];

export function renderMap(container, trek, onUpdate, queryParams = {}) {
  // If map container already exists, teardown old instance to avoid Leaflet "Map container is already initialized" error
  if (mapInstance) {
    try {
      mapInstance.remove();
    } catch (e) {
      console.warn('Map cleanup error:', e);
    }
    mapInstance = null;
  }

  const stagesWithTracks = (trek.stages || []).filter(s => s.trackGeoJSON);
  const initialStage = queryParams.stage ? parseInt(queryParams.stage, 10) : -1;

  const html = `
    <div class="map-view-layout">
      <div class="map-top-bar">
        <div class="map-tools-row">
          <button id="btn-zoom-all" class="btn btn-outline btn-sm active">🗺️ Giro Intero</button>
          <button id="btn-my-location" class="btn btn-outline btn-sm">📍 Mia Posizione</button>
          <label class="btn btn-outline btn-sm" for="map-gpx-upload" style="margin-bottom:0;cursor:pointer">
            📁 Carica GPX
          </label>
          <input type="file" id="map-gpx-upload" accept=".gpx" class="hidden">
        </div>

        <div class="stage-pills-scroll" id="stage-pills">
          ${(trek.stages || []).map(s => {
            const hasTrack = !!s.trackGeoJSON;
            const color = STAGE_COLORS[(s.stageNumber - 1) % STAGE_COLORS.length];
            return `
              <button class="stage-pill ${s.stageNumber === initialStage ? 'active' : ''}" 
                      data-stage="${s.stageNumber}" 
                      title="Tappa ${s.stageNumber}: ${escapeHtml(s.from)} → ${escapeHtml(s.to)}"
                      ${!hasTrack ? 'disabled style="opacity:0.4;"' : ''}>
                <span class="color-dot" style="background:${color}"></span>
                <span>T${s.stageNumber}</span>
              </button>
            `;
          }).join('')}
        </div>
      </div>

      <div id="leaflet-map-container" class="map-canvas"></div>

      <div class="map-stage-info-bar" id="map-stage-info">
        <span class="muted">Tocca una traccia o seleziona una tappa per visualizzare i dettagli.</span>
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Initialize Leaflet Map
  setTimeout(() => {
    initLeaflet(trek, initialStage, onUpdate);
  }, 50);

  // GPX File Upload from Map toolbar
  const gpxInput = container.querySelector('#map-gpx-upload');
  gpxInput.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = parseGPX(text);

      const stageChoices = (trek.stages || []).map(s => `${s.stageNumber}: ${s.from} → ${s.to}`).join('\n');
      const chosen = prompt(
        `File GPX "${parsed.name}" caricato (${parsed.distanceKm} km, +${parsed.elevationGainM}m D+).\n\nA quale numero di tappa desideri assegnare questa traccia?\n\nTappe disponibili:\n${stageChoices}`,
        '1'
      );

      if (chosen) {
        const stageNum = parseInt(chosen, 10);
        const targetStage = trek.stages.find(s => s.stageNumber === stageNum);
        if (targetStage) {
          targetStage.trackGeoJSON = parsed.trackGeoJSON;
          targetStage.distanceKm = parsed.distanceKm;
          targetStage.elevationGainM = parsed.elevationGainM;
          targetStage.elevationLossM = parsed.elevationLossM;
          onUpdate(trek);
          renderMap(container, trek, onUpdate, { stage: stageNum });
          alert(`Traccia associata alla Tappa ${stageNum}!`);
        } else {
          alert('Numero di tappa non valido.');
        }
      }
    } catch (err) {
      alert('Errore lettura GPX: ' + err.message);
    }
  });
}

function initLeaflet(trek, initialStage, onUpdate) {
  const mapEl = document.getElementById('leaflet-map-container');
  if (!mapEl) return;

  // 1. Create base layers
  // Offline-friendly neutral canvas tile (works 100% offline)
  const neutral = L.tileLayer(
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="%23eef1ec"/><path d="M0 256 L256 0" stroke="%23e4e8e2" stroke-width="1"/></svg>',
    { attribution: 'Mappa base offline' }
  );

  // Online OpenTopoMap layer
  const topo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    maxZoom: 17,
    attribution: 'Map data: &copy; OSM contributors, SRTM | Map style: &copy; OpenTopoMap'
  });

  // Online OSM layer
  const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  });

  // Instantiate map
  const defaultCenter = [45.65, 10.7]; // Lake Garda center
  mapInstance = L.map('leaflet-map-container', {
    layers: [neutral, topo],
    center: defaultCenter,
    zoom: 10,
    zoomControl: true
  });

  L.control.layers(
    { 'OpenTopoMap (online)': topo, 'OpenStreetMap (online)': osm, 'Sfondo neutro (offline)': neutral },
    null,
    { position: 'topright' }
  ).addTo(mapInstance);

  L.control.scale({ imperial: false }).addTo(mapInstance);

  const stageLayers = {};
  const allBounds = [];

  // Draw each stage
  (trek.stages || []).forEach((stage, idx) => {
    if (!stage.trackGeoJSON) return;

    const color = STAGE_COLORS[idx % STAGE_COLORS.length];
    const group = L.featureGroup();

    // Track Polyline from GeoJSON
    const trackLayer = L.geoJSON(stage.trackGeoJSON, {
      style: {
        color: color,
        weight: 6,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round'
      }
    });

    trackLayer.on('click', () => {
      selectStage(stage.stageNumber);
    });

    group.addLayer(trackLayer);

    // Track bounds
    try {
      const bounds = trackLayer.getBounds();
      if (bounds.isValid()) {
        allBounds.push(bounds);
      }
    } catch (e) {}

    // Add Accommodation Marker if coordinates present
    if (stage.accommodation?.coordinates && stage.accommodation.coordinates.length === 2) {
      const [lat, lng] = stage.accommodation.coordinates;
      const hotelIcon = L.divIcon({
        className: 'hotel-map-marker',
        html: `<div class="hotel-pin">🏨<span>T${stage.stageNumber}</span></div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 36]
      });

      const hotelMarker = L.marker([lat, lng], { icon: hotelIcon });
      hotelMarker.bindPopup(`
        <div class="map-popup">
          <h4>Tappa ${stage.stageNumber}: ${escapeHtml(stage.to)}</h4>
          <strong>${escapeHtml(stage.accommodation.name || 'Alloggio')}</strong>
          ${stage.accommodation.address ? `<p>${escapeHtml(stage.accommodation.address)}</p>` : ''}
          ${stage.accommodation.phone ? `<p><a href="tel:${stage.accommodation.phone}">📞 ${stage.accommodation.phone}</a></p>` : ''}
          ${stage.accommodation.website ? `<p><a href="${stage.accommodation.website}" target="_blank" rel="noopener">🌐 Sito Web ↗</a></p>` : ''}
          <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((stage.accommodation.name || '') + ' ' + (stage.accommodation.address || ''))}" target="_blank" rel="noopener" class="btn btn-outline btn-sm" style="display:inline-block;margin-top:6px">Naviga con Maps ↗</a>
        </div>
      `);
      group.addLayer(hotelMarker);
    }

    group.addTo(mapInstance);
    stageLayers[stage.stageNumber] = { group, trackLayer, stage, color };
  });

  // Fit all bounds if present
  if (allBounds.length > 0) {
    const combinedBounds = allBounds.reduce((acc, b) => acc.extend(b), L.latLngBounds(allBounds[0]));
    mapInstance.fitBounds(combinedBounds, { padding: [20, 20] });
  }

  // Handle stage selection
  function selectStage(stageNum) {
    currentStageSelected = stageNum;
    
    // Update pills active status
    document.querySelectorAll('#stage-pills .stage-pill').forEach(pill => {
      const num = parseInt(pill.dataset.stage, 10);
      pill.classList.toggle('active', num === stageNum);
    });
    document.getElementById('btn-zoom-all')?.classList.remove('active');

    // Update lines styling
    Object.keys(stageLayers).forEach(numStr => {
      const num = parseInt(numStr, 10);
      const item = stageLayers[num];
      if (num === stageNum) {
        item.trackLayer.setStyle({ weight: 9, opacity: 1.0 });
        item.group.bringToFront();
        try {
          mapInstance.fitBounds(item.trackLayer.getBounds(), { padding: [30, 30] });
        } catch (e) {}
      } else {
        item.trackLayer.setStyle({ weight: 4, opacity: 0.35 });
      }
    });

    // Update bottom info bar
    const selected = stageLayers[stageNum];
    if (selected) {
      const s = selected.stage;
      document.getElementById('map-stage-info').innerHTML = `
        <div class="stage-info-active">
          <div class="sia-left">
            <span class="color-badge" style="background:${selected.color}">Tappa ${s.stageNumber}</span>
            <strong>${escapeHtml(s.from)} → ${escapeHtml(s.to)}</strong>
          </div>
          <div class="sia-stats">
            <span>📏 ${s.distanceKm} km</span>
            <span>⛰️ +${s.elevationGainM}m</span>
            <span>⏱️ ≈ ${formatDuration(s.estimatedDurationHours)}</span>
            <a href="#/tappe?stage=${s.stageNumber}" class="btn btn-outline btn-sm">Scheda Tappa →</a>
          </div>
        </div>
      `;
    }
  }

  // Reset to all stages
  function showAll() {
    currentStageSelected = -1;
    document.querySelectorAll('#stage-pills .stage-pill').forEach(pill => pill.classList.remove('active'));
    document.getElementById('btn-zoom-all')?.classList.add('active');

    Object.values(stageLayers).forEach(item => {
      item.trackLayer.setStyle({ weight: 6, opacity: 0.85 });
    });

    if (allBounds.length > 0) {
      const combinedBounds = allBounds.reduce((acc, b) => acc.extend(b), L.latLngBounds(allBounds[0]));
      mapInstance.fitBounds(combinedBounds, { padding: [20, 20] });
    }

    document.getElementById('map-stage-info').innerHTML = `
      <span class="muted">Visualizzazione del tour completo (${trek.stages?.length || 0} tappe). Seleziona una tappa per i dettagli.</span>
    `;
  }

  // Event handlers
  document.getElementById('btn-zoom-all')?.addEventListener('click', showAll);

  document.querySelectorAll('#stage-pills .stage-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const num = parseInt(pill.dataset.stage, 10);
      selectStage(num);
    });
  });

  // Geolocation button
  document.getElementById('btn-my-location')?.addEventListener('click', () => {
    if (!navigator.geolocation) {
      alert('Geolocalizzazione non supportata dal browser.');
      return;
    }
    mapInstance.locate({ setView: true, maxZoom: 15 });
  });

  mapInstance.on('locationfound', (e) => {
    L.circleMarker(e.latlng, {
      radius: 9,
      fillColor: '#0074D9',
      color: '#fff',
      weight: 3,
      opacity: 1,
      fillOpacity: 0.9
    }).addTo(mapInstance).bindPopup('Sei qui').openPopup();
  });

  mapInstance.on('locationerror', (e) => {
    alert('Impossibile rilevare la posizione GPS: ' + e.message);
  });

  // If initialStage was specified in URL, select it!
  if (initialStage > 0 && stageLayers[initialStage]) {
    selectStage(initialStage);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

