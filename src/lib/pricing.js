/**
 * The pricing engine, customer-facing and admin-facing.
 *
 * Model: a stored batch is released in tranches. Each tranche is priced on the
 * day it leaves the farm store, so a batch sold over six weeks can carry three
 * different prices. Everyone inside a tranche pays the same rate; FIFO decides
 * who lands in which tranche.
 */

/** Default cost inputs, in rupees per kg unless stated. Tune as ops settle. */
export const PRICING_DEFAULTS = {
  premium: 2.0, // gaavthi / chemical-free / traceable multiple on the mandi rate
  storageCarryPerKgPerWeek: 1.5,
  packPerKg: 4,
  logisticsPerKg: 6, // baked into the headline price, never a separate line
  shrinkagePercent: 12, // typical for onion/turmeric over a storage season
};

/**
 * Shrinkage means you store more kg than you sell, so every sellable kg has to
 * carry the cost of the kg that evaporated. 100 kg in, 12% loss, 88 kg out:
 * the landed cost per sellable kg is 1 / 0.88 = 1.136x what you paid.
 */
export function shrinkageMultiplier(shrinkagePercent) {
  const loss = Math.min(Math.max(Number(shrinkagePercent) || 0, 0), 95) / 100;
  return 1 / (1 - loss);
}

/**
 * Suggested retail price per kg. Delivery is baked in, so this number is the
 * only one a customer ever sees.
 *
 *   retail = mandiRate x premium x shrinkage + storageCarry + pack + logistics
 */
export function suggestPrice({
  mandiRate,
  weeksInStore = 0,
  premium = PRICING_DEFAULTS.premium,
  storageCarryPerKgPerWeek = PRICING_DEFAULTS.storageCarryPerKgPerWeek,
  packPerKg = PRICING_DEFAULTS.packPerKg,
  logisticsPerKg = PRICING_DEFAULTS.logisticsPerKg,
  shrinkagePercent = PRICING_DEFAULTS.shrinkagePercent,
  floor = 0,
} = {}) {
  const rate = Number(mandiRate) || 0;
  if (!rate) return null;

  const landed = rate * shrinkageMultiplier(shrinkagePercent);
  const carry = Number(storageCarryPerKgPerWeek) * Number(weeksInStore);
  const retail = landed * Number(premium) + carry + Number(packPerKg) + Number(logisticsPerKg);

  return Math.max(Number(floor) || 0, Math.round(retail));
}

/** Landed cost per sellable kg — what a tranche price has to beat. */
export function costPerSellableKg({
  mandiRate,
  weeksInStore = 0,
  storageCarryPerKgPerWeek = PRICING_DEFAULTS.storageCarryPerKgPerWeek,
  packPerKg = PRICING_DEFAULTS.packPerKg,
  logisticsPerKg = PRICING_DEFAULTS.logisticsPerKg,
  shrinkagePercent = PRICING_DEFAULTS.shrinkagePercent,
} = {}) {
  const rate = Number(mandiRate) || 0;
  if (!rate) return null;

  return (
    rate * shrinkageMultiplier(shrinkagePercent) +
    Number(storageCarryPerKgPerWeek) * Number(weeksInStore) +
    Number(packPerKg) +
    Number(logisticsPerKg)
  );
}

/** Gross margin on a tranche price, as a percentage of revenue. */
export function marginPercent(pricePerKg, cost) {
  const price = Number(pricePerKg);
  if (!price || cost === null || cost === undefined) return null;
  return ((price - Number(cost)) / price) * 100;
}

/** Is this tranche price above the ceiling we quoted at reserve time? */
export function breachesBand(pricePerKg, estimatedPriceHighPerKg) {
  if (!estimatedPriceHighPerKg) return false;
  return Number(pricePerKg) > Number(estimatedPriceHighPerKg);
}

/** Formatted "Est. ₹70–82/kg" band, or null when no band is set. */
export function priceBand(batch) {
  if (!batch?.estimatedPriceLowPerKg || !batch?.estimatedPriceHighPerKg) return null;
  return { low: Number(batch.estimatedPriceLowPerKg), high: Number(batch.estimatedPriceHighPerKg) };
}
