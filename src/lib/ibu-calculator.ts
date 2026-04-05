/**
 * Calculates derived Alpha Acid incorporating Hop Storage Index (HSI) loss.
 * Adjusts true bitterness potential for older hop stock.
 */
export function calculateHsiAdjustedIBU(
  weightLbs: number,
  boilTimeMins: number,
  initialAlphaAcidPct: number,
  hsiCurrentPct: number, 
  batchVolumeGal: number
): number {
  if (batchVolumeGal <= 0) return 0
  
  // Adjusted AA based on degradation loss percentage
  // Example: if HSI current loss is 15%, we retain 85% of AA
  const currentAlphaAcid = initialAlphaAcidPct * (1 - (hsiCurrentPct / 100))
  
  // Generic utilization curve approximation based on boil time
  // Tinseth Utilization simplified for MVP (~1.050 OG assumption)
  const utilization = (1 - Math.exp(-0.04 * boilTimeMins)) / 4.15 * 1.05

  // IBU = (Weight (lbs) * AA% * Utilization * 74.89) / Volume (gal)
  const ibu = (weightLbs * currentAlphaAcid * utilization * 74.89) / batchVolumeGal
  
  return Math.max(0, Math.round(ibu * 10) / 10)
}
