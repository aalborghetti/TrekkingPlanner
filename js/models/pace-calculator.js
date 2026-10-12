/**
 * Pace Calculator module for TrekkingPlanner
 * Calculates walking times based on distance, elevation gain, and customizable pace settings.
 */

export const DEFAULT_PACE = {
  flatKmH: 4.5,   // Km per hour on flat terrain
  elevUpMH: 450   // Meters of elevation gain per hour
};

/**
 * Calculates estimated walking duration in hours using modified Naismith rule.
 * @param {number} distanceKm 
 * @param {number} elevationGainM 
 * @param {object} paceConfig 
 * @returns {number} duration in decimal hours (rounded to 2 decimals)
 */
export function calculateDurationHours(distanceKm, elevationGainM, paceConfig = DEFAULT_PACE) {
  const flatSpeed = Number(paceConfig?.flatKmH) || DEFAULT_PACE.flatKmH;
  const climbSpeed = Number(paceConfig?.elevUpMH) || DEFAULT_PACE.elevUpMH;
  
  const dist = Math.max(0, Number(distanceKm) || 0);
  const elev = Math.max(0, Number(elevationGainM) || 0);
  
  const flatHours = dist / flatSpeed;
  const climbHours = elev / climbSpeed;
  
  const total = flatHours + climbHours;
  // Round to nearest 15 minutes (0.25 h) for realistic trekking estimation
  return Math.round(total * 4) / 4;
}

/**
 * Formats decimal hours into a readable string (e.g. "5 h 30 min", "4 h", "45 min").
 * @param {number} decimalHours 
 * @returns {string}
 */
export function formatDuration(decimalHours) {
  if (!decimalHours || decimalHours <= 0) return '0 min';
  
  const totalMinutes = Math.round(decimalHours * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (hours === 0) {
    return `${minutes} min`;
  }
  if (minutes === 0) {
    return `${hours} h`;
  }
  return `${hours} h ${minutes} min`;
}

/**
 * Calculates aggregate totals across all stages of a trek.
 * @param {Array} stages 
 * @param {object} paceConfig 
 * @returns {object} { totalKm, totalGainM, totalLossM, totalHours, formattedHours }
 */
export function calculateTrekTotals(stages = [], paceConfig = DEFAULT_PACE) {
  let totalKm = 0;
  let totalGainM = 0;
  let totalLossM = 0;
  let totalHours = 0;
  
  for (const s of stages) {
    const km = Number(s.distanceKm) || 0;
    const gain = Number(s.elevationGainM) || 0;
    const loss = Number(s.elevationLossM) || 0;
    const hours = s.estimatedDurationHours != null && s.estimatedDurationHours !== ''
      ? Number(s.estimatedDurationHours)
      : calculateDurationHours(km, gain, paceConfig);
      
    totalKm += km;
    totalGainM += gain;
    totalLossM += loss;
    totalHours += hours;
  }
  
  return {
    totalKm: Math.round(totalKm * 10) / 10,
    totalGainM: Math.round(totalGainM),
    totalLossM: Math.round(totalLossM),
    totalHours: Math.round(totalHours * 10) / 10,
    formattedHours: formatDuration(totalHours)
  };
}

