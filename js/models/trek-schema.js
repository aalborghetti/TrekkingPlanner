/**
 * Trekking Schema & Validation
 * Defines and validates the universal trek data model.
 */

export const SCHEMA_VERSION = '1.0';

/**
 * Validates a trek object against the Trekking Schema.
 * Throws an Error if invalid.
 * @param {object} data 
 * @returns {boolean}
 */
export function validateTrek(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('I dati forniti non sono un oggetto JSON valido.');
  }
  if (!data.version) {
    throw new Error('Campo "version" mancante nel file trekking.');
  }
  if (!data.meta || typeof data.meta !== 'object') {
    throw new Error('Sezione "meta" mancante o non valida.');
  }
  if (!data.meta.id || !data.meta.title) {
    throw new Error('Dati meta incompleti: "id" e "title" sono obbligatori.');
  }
  if (!Array.isArray(data.stages)) {
    throw new Error('La sezione "stages" deve essere un array.');
  }
  if (!data.checklists || typeof data.checklists !== 'object') {
    data.checklists = { backpack: [], evening: [] };
  }
  if (!Array.isArray(data.checklists.backpack)) {
    data.checklists.backpack = [];
  }
  if (!Array.isArray(data.checklists.evening)) {
    data.checklists.evening = [];
  }
  
  return true;
}

/**
 * Creates a brand new empty trek structure.
 * @param {object} meta 
 * @returns {object}
 */
export function createNewTrek(meta = {}) {
  const id = (meta.title || 'nuovo-trek')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);

  return {
    version: SCHEMA_VERSION,
    meta: {
      id: meta.id || id,
      title: meta.title || 'Nuovo Trekking',
      startDate: meta.startDate || new Date().toISOString().slice(0, 10),
      endDate: meta.endDate || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      description: meta.description || 'Pianificazione itinerario a tappe.',
      paceConfig: {
        flatKmH: meta.flatKmH || 4.5,
        elevUpMH: meta.elevUpMH || 450
      },
      packConfig: {
        baseWeightKg: 7.0,
        waterLiters: 2.0,
        foodKg: 0.7
      }
    },
    stages: [
      {
        stageNumber: 1,
        date: meta.startDate || new Date().toISOString().slice(0, 10),
        from: 'Partenza',
        to: 'Arrivo Tappa 1',
        distanceKm: 15.0,
        elevationGainM: 500,
        elevationLossM: 400,
        estimatedDurationHours: 4.5,
        notes: '',
        planB: '',
        accommodation: {
          name: 'Rifugio / Hotel',
          address: '',
          phone: '',
          website: '',
          checkInNotes: '',
          coordinates: null
        },
        trackGeoJSON: null
      }
    ],
    checklists: {
      backpack: [
        { id: 'b01', category: 'Indossato', item: 'Scarpe da trekking collaudate', checked: false },
        { id: 'b02', category: 'Indossato', item: 'Maglia e pantaloni tecnici', checked: false },
        { id: 'b03', category: 'Abbigliamento', item: 'Guscio impermeabile con cappuccio', checked: false },
        { id: 'b04', category: 'Abbigliamento', item: 'Pile leggero o piumino compatto', checked: false },
        { id: 'b05', category: 'Abbigliamento', item: 'Cambi intimo e calze tecniche', checked: false },
        { id: 'b06', category: 'Sicurezza & Orientamento', item: 'Smartphone con tracce GPX e mappe offline', checked: false },
        { id: 'b07', category: 'Sicurezza & Orientamento', item: 'Kit primo soccorso e coperta termica', checked: false },
        { id: 'b08', category: 'Sicurezza & Orientamento', item: 'Lampada frontale', checked: false },
        { id: 'b09', category: 'Acqua e Cibo', item: 'Borracce per acqua (min 2L)', checked: false },
        { id: 'b10', category: 'Acqua e Cibo', item: 'Snack energetici e pranzo al sacco', checked: false },
        { id: 'b11', category: 'Elettronica & Igiene', item: 'Power bank e cavi di ricarica', checked: false }
      ],
      evening: [
        { id: 'e01', item: 'Controllo meteo, vento e temperature per domani', checked: false },
        { id: 'e02', item: 'Traccia GPX e mappa offline verificate sul dispositivo', checked: false },
        { id: 'e03', item: 'Telefono e power bank carichi al 100%', checked: false },
        { id: 'e04', item: 'Indirizzo e check-in della prossima struttura verificati', checked: false },
        { id: 'e05', item: 'Acqua e scorte di cibo preparate', checked: false },
        { id: 'e06', item: 'Punti di uscita di emergenza e trasporti individuati', checked: false }
      ]
    }
  };
}

/**
 * Formats ISO date string (YYYY-MM-DD) to friendly Italian format (e.g. "Sabato 3 ottobre 2026").
 * @param {string} isoDate 
 * @returns {string}
 */
export function formatFriendlyDate(isoDate) {
  if (!isoDate) return '';
  try {
    const parts = isoDate.split('-');
    if (parts.length !== 3) return isoDate;
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    return d.toLocaleDateString('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch (e) {
    return isoDate;
  }
}

