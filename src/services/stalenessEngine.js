/**
 * Staleness Detection Engine
 * Evaluates whether dated quotes are fresh, aging, or stale based on hours elapsed.
 */

const { settings } = require('../config');

function evaluateQuoteFreshness(quoteDate, thresholdHours = settings.staleQuoteThresholdHours) {
  if (!quoteDate) {
    return {
      isStale: true,
      ageHours: 9999,
      level: 'VERY_STALE',
      warning: 'Quote has no recorded date. Do not use for commercial decisions.'
    };
  }

  const quoteTime = new Date(quoteDate).getTime();
  const now = Date.now();
  const diffMs = now - quoteTime;
  const ageHours = Math.max(0, Math.round(diffMs / (1000 * 60 * 60)));

  let level = 'FRESH';
  let warning = null;
  let isStale = false;

  if (ageHours > thresholdHours * 2) {
    level = 'VERY_STALE';
    isStale = true;
    warning = `Critical Alert: Quote is ${ageHours} hours old (${Math.round(ageHours/24)} days). High risk of mandi price drift or arrival changes.`;
  } else if (ageHours > thresholdHours) {
    level = 'STALE';
    isStale = true;
    warning = `Notice: Quote is ${ageHours} hours old (threshold is ${thresholdHours}h). Verify gate arrivals before loading vehicles.`;
  } else if (ageHours > 24) {
    level = 'AGING';
    isStale = false;
    warning = `Quote is from yesterday (${ageHours}h ago). Reasonable for standard planning.`;
  } else {
    level = 'FRESH';
    isStale = false;
    warning = 'Fresh quote logged today.';
  }

  return {
    isStale,
    ageHours,
    level,
    warning,
    thresholdHours
  };
}

module.exports = {
  evaluateQuoteFreshness
};
