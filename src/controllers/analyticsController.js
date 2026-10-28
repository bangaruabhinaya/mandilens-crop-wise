const { getDb } = require('../models/db');
const { calculateNetReturn } = require('../services/netReturnEngine');

async function getDashboardMetrics(req, res, next) {
  try {
    const db = getDb();
    const userId = req.user && req.user.role === 'farmer' ? req.user.id : null;
    const metrics = await db.getMetrics(userId);

    // Also get quick best net-return recommendations for top crops
    const wheatQuotes = await db.getQuotes({ cropId: 'c0000000-0000-0000-0000-000000000001' });
    const soyQuotes = await db.getQuotes({ cropId: 'c0000000-0000-0000-0000-000000000003' });
    const onionQuotes = await db.getQuotes({ cropId: 'c0000000-0000-0000-0000-000000000004' });

    res.json({
      success: true,
      data: {
        ...metrics,
        summaryRecommendations: [
          { crop: 'Sharbati Wheat', bestNetMarket: 'Indore APMC', netPrice: '₹2,770/qtl', headlineGap: '-₹310 vs Azadpur, but +₹42 net higher' },
          { crop: 'Yellow Soybean', bestNetMarket: 'ITC Choupal Sagar', netPrice: '₹4,705/qtl', headlineGap: '0% commission saves ₹97/qtl over mandi' },
          { crop: 'Nashik Red Onion', bestNetMarket: 'Lasalgaon Hub', netPrice: '₹2,492/qtl', headlineGap: 'Export demand beats local Sehore yard by +₹260/qtl' }
        ]
      }
    });
  } catch (err) {
    next(err);
  }
}

async function getPriceHistory(req, res, next) {
  try {
    const { crop_id, days = 14 } = req.query;
    const db = getDb();
    const cropId = crop_id || 'c0000000-0000-0000-0000-000000000001'; // Default Wheat
    const crop = await db.getCropById(cropId);
    const markets = await db.getMarkets();

    // Generate daily historical price and net return series for realistic visualization
    const dates = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      dates.push(d.toISOString().split('T')[0]);
    }

    // Top 3 tracked mandis for this crop
    const trackedMarkets = markets.slice(0, 3);
    const series = trackedMarkets.map((m, mIdx) => {
      // Base price variations
      const basePrice = cropId === 'c0000000-0000-0000-0000-000000000003' 
        ? 4750 
        : (cropId === 'c0000000-0000-0000-0000-000000000004' ? 2400 : 2850);
      const marketOffset = mIdx === 0 ? 0 : (mIdx === 1 ? 140 : 380);

      const points = dates.map((dateStr, dIdx) => {
        // Natural sine-wave fluctuation + random variation
        const dayFluctuation = Math.round(Math.sin((dIdx + mIdx) * 0.8) * 45 + (dIdx * 4));
        const headline = basePrice + marketOffset + dayFluctuation;

        // Calculate net return for 50 quintals
        const netCalc = calculateNetReturn({
          headlinePrice: headline,
          volumeQtl: 50,
          distanceKm: m.distance_km_default || 25,
          transportRatePerKmQtl: 0.85,
          handlingPerQtl: m.standard_handling_per_qtl || 18,
          commissionPct: m.standard_commission_pct || 2.0,
          marketCessPct: m.market_cess_pct || 1.0,
          packagingPerQtl: 20,
          qualityDeductionPerQtl: 0
        });

        return {
          date: dateStr,
          headlinePrice: headline,
          netPricePerQtl: netCalc.netPricePerQtl,
          totalDeductions: netCalc.costs.totalDeductions
        };
      });

      return {
        marketId: m.id,
        marketName: m.name,
        marketType: m.type,
        distanceKm: m.distance_km_default,
        dataPoints: points
      };
    });

    res.json({
      success: true,
      data: {
        crop,
        dates,
        series
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboardMetrics,
  getPriceHistory
};
