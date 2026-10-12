# TrekkingPlanner

**TrekkingPlanner** è una Progressive Web App (PWA) e Single Page Application (SPA) moderna, modulare, 100% offline-first e agnostica rispetto al percorso, nata dall'evoluzione del progetto *GiroLagoGarda*.

Funziona come motore universale per trekking a tappe, gestendo l'intero ciclo di vita del viaggio (creazione, editing, visualizzazione GPX, checklist, calcolo del passo, alloggi e controlli serali) con persistenza locale in **IndexedDB** ed esportazione/importazione tramite un unico file JSON standard compatibile con iOS File, iCloud Drive e qualsiasi browser.

---

## Caratteristiche Principali

- **Local-First & Zero Backend:** Funziona al 100% nel browser del dispositivo, senza necessità di server, database cloud o API key a pagamento.
- **Persistenza su IndexedDB:** Nessuna perdita di dati al reload o alla chiusura del browser. Supporto per la persistenza di sistema (`navigator.storage.persist()`).
- **Offline Shell PWA:** Service Worker (`sw.js`) con strategia Cache-First per tutti gli asset (HTML, CSS, JS, icone, mappe e libreria Leaflet).
- **Mobile-First & Ottimizzato per iOS Safari:** Gestione delle safe area inset per notch e Dynamic Island, layout reattivo con barra di navigazione inferiore su smartphone e barra superiore su desktop.
- **Mappa Interattiva Leaflet & Parser GPX Integrato:**
  - Caricamento e rendering istantaneo delle tracce con quote e distanze.
  - Sfondo neutro funzionante al 100% offline e livelli online (OpenTopoMap, OpenStreetMap).
  - Parser GPX lato client: trascina o carica un file `.gpx` per associarlo a una tappa o calcolarne dislivello e distanza.
  - Marker e popup interattivi per gli alloggi e i punti tappa.
- **Calcolo Dinamico del Passo:** Regola di Naismith personalizzabile con parametri di velocità in piano (km/h) e salita oraria (D+/h).
- **Zaino & Calcolatore di Peso:** Checklist interattiva categorizzata per zaini da 35–40L, con stima dinamica del peso in base a litri d'acqua e cibo.
- **Check Serale & Servizi:** Controlli di sicurezza salvati singolarmente per ogni tappa, meteo rapido e ricerca servizi nei paesi tappa.
- **Modello Dati Universale (Trekking Schema v1.0):** Esporta o importa l'intero trekking in un singolo file compatto `.json`.
- **Modello Predefinito:** Include pre-caricato l'itinerario completo del *Grande Giro del Garda 2026* (9 tappe, 201,7 km, 5.800 m D+, contatti strutture e tutte le tracce GPX originali).

---

## Architettura e Modello Dati JSON (Trekking Schema)

L'intero stato dell'applicazione è serializzabile in un unico file `.json`:

```json
{
  "version": "1.0",
  "meta": {
    "id": "garda-2026",
    "title": "Grande Giro del Garda 2026",
    "startDate": "2026-10-03",
    "endDate": "2026-10-11",
    "description": "Itinerario a piedi attorno al Lago di Garda",
    "paceConfig": { "flatKmH": 4.5, "elevUpMH": 450 },
    "packConfig": { "baseWeightKg": 7.2, "waterLiters": 2.0, "foodKg": 0.7 }
  },
  "stages": [
    {
      "stageNumber": 1,
      "date": "2026-10-03",
      "from": "Desenzano",
      "to": "Peschiera",
      "distanceKm": 24.6,
      "elevationGainM": 50,
      "elevationLossM": 40,
      "estimatedDurationHours": 5.0,
      "notes": "Percorso basso e urbanizzato...",
      "planB": "Frequenti collegamenti ferroviari e bus...",
      "accommodation": {
        "name": "Meet Garda Lake Hostel",
        "address": "Via Benaco 14/A, Peschiera del Garda",
        "phone": "+390458240950",
        "website": "https://www.meethostel.com/",
        "checkInNotes": "Accesso con app della struttura.",
        "coordinates": [45.438, 10.693]
      },
      "trackGeoJSON": { ... }
    }
  ],
  "checklists": {
    "backpack": [
      { "id": "b1", "category": "Indossato", "item": "Scarpe da trekking collaudate", "checked": true }
    ],
    "evening": [
      { "id": "e1", "item": "Ricarica powerbank", "checked": false }
    ]
  }
}
```

---

## Struttura del Progetto

```
├── index.html               # Shell principale della SPA
├── manifest.webmanifest     # Descrittore PWA (standalone, icone, tema)
├── sw.js                    # Service Worker con cache-first offline shell
├── default-trek.json        # Template iniziale (Giro del Garda 2026)
├── css/
│   ├── app.css              # Stili mobile-first, iOS safe-area, componenti UI
│   └── leaflet.css          # Foglio di stile Leaflet
├── js/
│   ├── app.js               # Entry point e router hash-based client-side
│   ├── db.js                # Wrapper IndexedDB Local-First e persistenza
│   ├── models/
│   │   ├── trek-schema.js   # Validazione schema e generatori modelli
│   │   ├── pace-calculator.js # Calcolo tempi di percorrenza e passo
│   │   └── gpx-parser.js    # Parser XML GPX -> GeoJSON con distanze e quote
│   └── views/
│       ├── dashboard-view.js # Panoramica, metriche e ritmo di marcia
│       ├── stages-view.js    # Lista tappe, editor alloggi e dettagli
│       ├── map-view.js       # Mappa interattiva Leaflet e visualizzatore GPX
│       ├── checklist-view.js # Checklist zaino e calcolatore pesi
│       ├── evening-view.js   # Check serale pre-tappa e appunti
│       ├── services-view.js  # Servizi utili nei paesi tappa
│       └── settings-view.js  # Import/Export JSON, diagnostica e backup
├── leaflet.js               # Libreria cartografica Leaflet (inclusa localmente)
├── icon-192.png             # Icona PWA mobile
├── icon-512.png             # Icona splash screen / desktop
├── apple-touch-icon.png     # Icona Home iOS Safari
├── favicon.svg              # Favicon vettoriale SVG
└── favicon.ico              # Favicon standard multi-formato
```

---

## Utilizzo Locale e Distribuzione

- **Uso Locale:** Apri semplicemente `index.html` con un server statico locale (es. `npx serve`, o estensione *Live Server* di VS Code, oppure `python -m http.server 8000`).
- **Pubblicazione su GitHub Pages:** È sufficiente abilitare GitHub Pages sul ramo `main`. Grazie al Service Worker e alla struttura agnostica statica, l'applicazione sarà installabile come PWA su iPhone (Safari -> *Aggiungi alla schermata Home*) e Android (Chrome -> *Installa app*).
