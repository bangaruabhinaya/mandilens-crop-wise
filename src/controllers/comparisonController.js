const { getDb } = require('../models/db');
const { compareMarkets, calculateNetReturn } = require('../services/netReturnEngine');

async function runComparison(req, res, next) {
  try {
    const {
      crop_id,
      grade_id,
      volume_qtl = 50,
      transport_rate_per_km_qtl,
      handling_per_qtl,
      commission_pct,
      market_cess_pct,
      packaging_per_qtl,
      quality_deduction_per_qtl,
      custom_distances = {}
    } = req.body;

    if (!crop_id) {
      return res.status(400).json({
        success: false,
        error: { message: 'Crop selection is required for net-return comparison.', code: 'MISSING_PARAM' }
      });
    }

    const db = getDb();
    const volume = Math.max(0.1, Number(volume_qtl) || 50);

    // Fetch quotes for this crop (and grade if specified)
    let quotes = await db.getQuotes({ cropId: crop_id, gradeId: grade_id });

    if (quotes.length === 0) {
      // If no quotes for specific grade, fall back to any grade of that crop
      quotes = await db.getQuotes({ cropId: crop_id });
    }

    if (quotes.length === 0) {
      return res.json({
        success: true,
        data: {
          results: [],
          winner: null,
          message: 'No recent quotes found for the selected crop. Add or import quotes to compare markets.'
        }
      });
    }

    // Group quotes by market: pick the most recent quote per market
    const latestByMarket = new Map();
    quotes.forEach(q => {
      const existing = latestByMarket.get(q.market_id);
      if (!existing || new Date(q.quote_date) > new Date(existing.quote_date)) {
        latestByMarket.set(q.market_id, q);
      }
    });

    const uniqueQuotes = Array.from(latestByMarket.values());

    // Prepare user custom cost parameters
    const userCustomCosts = {
      transportRatePerKmQtl: transport_rate_per_km_qtl != null ? Number(transport_rate_per_km_qtl) : undefined,
      handlingPerQtl: handling_per_qtl != null ? Number(handling_per_qtl) : undefined,
      commissionPct: commission_pct != null ? Number(commission_pct) : undefined,
      marketCessPct: market_cess_pct != null ? Number(market_cess_pct) : undefined,
      packagingPerQtl: packaging_per_qtl != null ? Number(packaging_per_qtl) : undefined,
      qualityDeductionPerQtl: quality_deduction_per_qtl != null ? Number(quality_deduction_per_qtl) : undefined
    };

    // Apply custom distances if provided
    uniqueQuotes.forEach(q => {
      if (custom_distances[q.market_id]) {
        q.market.distance_km_default = Number(custom_distances[q.market_id]);
      }
    });

    const comparison = compareMarkets({
      quotes: uniqueQuotes,
      volumeQtl: volume,
      userCustomCosts
    });

    const crop = await db.getCropById(crop_id);
    const grade = grade_id ? await db.getGradeById(grade_id) : null;

    res.json({
      success: true,
      data: {
        crop,
        grade,
        volumeQtl: volume,
        ...comparison
      }
    });
  } catch (err) {
    next(err);
  }
}

async function quickCalculate(req, res, next) {
  try {
    const {
      headlinePrice,
      volumeQtl = 50,
      distanceKm = 25,
      transportRatePerKmQtl = 0.85,
      handlingPerQtl = 18.0,
      commissionPct = 2.0,
      marketCessPct = 1.0,
      packagingPerQtl = 20.0,
      qualityDeductionPerQtl = 0.0
    } = req.body;

    const result = calculateNetReturn({
      headlinePrice: Number(headlinePrice) || 0,
      volumeQtl: Number(volumeQtl) || 50,
      distanceKm: Number(distanceKm) || 25,
      transportRatePerKmQtl: Number(transportRatePerKmQtl) || 0.85,
      handlingPerQtl: Number(handlingPerQtl) || 18.0,
      commissionPct: Number(commissionPct) || 2.0,
      marketCessPct: Number(marketCessPct) || 1.0,
      packagingPerQtl: Number(packagingPerQtl) || 20.0,
      qualityDeductionPerQtl: Number(qualityDeductionPerQtl) || 0.0
    });

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  runComparison,
  quickCalculate
};
