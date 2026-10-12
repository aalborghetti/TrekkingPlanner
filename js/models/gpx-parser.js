/**
 * Client-Side In-Browser GPX Parser
 * Converts GPX XML into GeoJSON, computes distance, elevation gain/loss, and track bounds.
 */

/**
 * Calculates distance between two WGS84 lat/lng points in kilometers using Haversine formula.
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371.0; // Earth radius in km
  const toRad = deg => (deg * Math.PI) / 180;
  
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Parses GPX XML text string and extracts coordinates, distance, and elevation.
 * @param {string} gpxText - raw GPX XML string
 * @returns {object} { name, distanceKm, elevationGainM, elevationLossM, pointsCount, trackGeoJSON, bounds }
 */
export function parseGPX(gpxText) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(gpxText, 'application/xml');
  
  const parserError = xml.querySelector('parsererror');
  if (parserError) {
    throw new Error('File GPX non valido o corrotto: ' + parserError.textContent);
  }
  
  // Track name
  const nameEl = xml.querySelector('trk > name') || xml.querySelector('metadata > name');
  const trackName = nameEl ? nameEl.textContent.trim() : 'Traccia GPX';
  
  // Track points (trkpt or rtept)
  let ptElements = Array.from(xml.querySelectorAll('trkpt'));
  if (ptElements.length === 0) {
    ptElements = Array.from(xml.querySelectorAll('rtept'));
  }
  if (ptElements.length === 0) {
    throw new Error('Nessun punto di traccia (trkpt/rtept) trovato nel file GPX.');
  }
  
  const coordinates = [];
  let totalDistanceKm = 0;
  let totalGainM = 0;
  let totalLossM = 0;
  
  let minLat = Infinity, maxLat = -Infinity;
  let minLng = Infinity, maxLng = -Infinity;
  
  let prevLat = null;
  let prevLon = null;
  let prevEle = null;
  
  for (const pt of ptElements) {
    const lat = parseFloat(pt.getAttribute('lat'));
    const lon = parseFloat(pt.getAttribute('lon'));
    
    if (isNaN(lat) || isNaN(lon)) continue;
    
    const eleEl = pt.querySelector('ele');
    const ele = eleEl ? parseFloat(eleEl.textContent) : 0;
    
    // Bounds
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lon < minLng) minLng = lon;
    if (lon > maxLng) maxLng = lon;
    
    // GeoJSON coordinate order is [longitude, latitude, elevation]
    coordinates.push([lon, lat, isNaN(ele) ? 0 : ele]);
    
    // Distance & Elevation metrics
    if (prevLat !== null && prevLon !== null) {
      const stepDist = haversineDistance(prevLat, prevLon, lat, lon);
      totalDistanceKm += stepDist;
      
      if (!isNaN(ele) && prevEle !== null && !isNaN(prevEle)) {
        const deltaEle = ele - prevEle;
        // Simple smoothing threshold (1.5m) to avoid GPS altimeter jitter
        if (Math.abs(deltaEle) >= 1.5) {
          if (deltaEle > 0) totalGainM += deltaEle;
          else totalLossM += Math.abs(deltaEle);
        }
      }
    }
    
    prevLat = lat;
    prevLon = lon;
    if (!isNaN(ele)) prevEle = ele;
  }
  
  const trackGeoJSON = {
    type: 'Feature',
    properties: {
      name: trackName,
      distanceKm: Math.round(totalDistanceKm * 10) / 10,
      elevationGainM: Math.round(totalGainM),
      elevationLossM: Math.round(totalLossM)
    },
    geometry: {
      type: 'LineString',
      coordinates
    }
  };
  
  return {
    name: trackName,
    distanceKm: Math.round(totalDistanceKm * 10) / 10,
    elevationGainM: Math.round(totalGainM),
    elevationLossM: Math.round(totalLossM),
    pointsCount: coordinates.length,
    trackGeoJSON,
    bounds: [[minLat, minLng], [maxLat, maxLng]]
  };
}

