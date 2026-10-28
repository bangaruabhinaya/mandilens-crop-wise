/**
 * Net-Return Comparison Engine
 * Computes the real cash-in-hand return for agricultural commodities after all
 * logistics, regulatory, packaging, handling, and quality deductions.
 */

function calculateNetReturn({
  headlinePrice,         // e.g. 2980.00 (₹ per quintal)
  volumeQtl,             // e.g. 65.0 (quintals)
  distanceKm,            // e.g. 85.0 (km)
  transportRatePerKmQtl, // e.g. 0.85 (₹/km/qtl)
  flatTransportCost,     // optional lump sum e.g. 0
  handlingPerQtl,        // Hamali/labor e.g. 18.0 (₹/qtl)
  commissionPct,         // Market commission e.g. 2.0 (%)
  marketCessPct,         // Mandi dev cess e.g. 1.0 (%)
  packagingPerQtl,       // Bags cost per quintal e.g. 20.0 (₹/qtl)
  qualityDeductionPerQtl // Moisture/refraction cut e.g. 10.0 (₹/qtl)
}) {
  const price = Math.max(0, Number(headlinePrice) || 0);
  const vol = Math.max(0.01, Number(volumeQtl) || 1);
  const dist = Math.max(0, Number(distanceKm) || 0);
  const rate = Math.max(0, Number(transportRatePerKmQtl) || 0);
  const flatFreight = Math.max(0, Number(flatTransportCost) || 0);
  const handling = Math.max(0, Number(handlingPerQtl) || 0);
  const commPct = Math.max(0, Number(commissionPct) || 0);
  const cessPct = Math.max(0, Number(marketCessPct) || 0);
  const bagCost = Math.max(0, Number(packagingPerQtl) || 0);
  const qualityCut = Math.max(0, Number(qualityDeductionPerQtl) || 0);

  // 1. Gross Revenue at headline price
  const grossRevenue = Math.round(price * vol * 100) / 100;

  // 2. Logistics: Freight
  const transportCost = flatFreight > 0 
    ? Math.round(flatFreight * 100) / 100 
    : Math.round(dist * rate * vol * 100) / 100;

  // 3. Mandi Handling / Hamali
  const handlingCost = Math.round(handling * vol * 100) / 100;

  // 4. Commission Fees (% of gross)
  const commissionCost = Math.round(grossRevenue * (commPct / 100) * 100) / 100;

  // 5. Market Cess (% of gross)
  const cessCost = Math.round(grossRevenue * (cessPct / 100) * 100) / 100;

  // 6. Packaging / Bags
  const packagingCost = Math.round(bagCost * vol * 100) / 100;

  // 7. Quality / Moisture cut
  const qualityDeductionCost = Math.round(qualityCut * vol * 100) / 100;

  // Total deductions
  const totalDeductions = Math.round(
    (transportCost + handlingCost + commissionCost + cessCost + packagingCost + qualityDeductionCost) * 100
  ) / 100;

  // Net Realized Return & Net Price per Quintal
  const netReturn = Math.round((grossRevenue - totalDeductions) * 100) / 100;
  const netPricePerQtl = Math.round((netReturn / vol) * 100) / 100;

  // Per quintal breakdown for intuitive farmer display
  const transportPerQtl = Math.round((transportCost / vol) * 100) / 100;
  const commissionPerQtl = Math.round((commissionCost / vol) * 100) / 100;
  const cessPerQtl = Math.round((cessCost / vol) * 100) / 100;
  const totalDeductionPerQtl = Math.round((totalDeductions / vol) * 100) / 100;
  const deductionPct = grossRevenue > 0 
    ? Math.round((totalDeductions / grossRevenue) * 1000) / 10 
    : 0;

  return {
    volumeQtl: vol,
    headlinePrice,
    grossRevenue,
    costs: {
      transportCost,
      handlingCost,
      commissionCost,
      cessCost,
      packagingCost,
      qualityDeductionCost,
      totalDeductions
    },
    perQuintal: {
      transport: transportPerQtl,
      handling: handling,
      commission: commissionPerQtl,
      cess: cessPerQtl,
      packaging: bagCost,
      quality: qualityCut,
      totalDeduction: totalDeductionPerQtl,
      netPrice: netPricePerQtl
    },
    netReturn,
    netPricePerQtl,
    deductionPct
  };
}

/**
 * Compare multiple market quotes for a specific lot.
 * Identifies the winning market by Net Realized Return (not merely headline price).
 */
function compareMarkets({
  quotes,
  volumeQtl,
  userCustomCosts = {}
}) {
  if (!Array.isArray(quotes) || quotes.length === 0) {
    return { results: [], winner: null, comparisonSummary: 'No market quotes provided.' };
  }

  const results = quotes.map(quote => {
    const market = quote.market || {};
    const distanceKm = userCustomCosts.distanceKm != null && userCustomCosts.marketId === market.id 
      ? userCustomCosts.distanceKm 
      : (market.distance_km_default || 25);

    const transportRate = userCustomCosts.transportRatePerKmQtl != null 
      ? userCustomCosts.transportRatePerKmQtl 
      : 0.85;

    const handlingPerQtl = userCustomCosts.handlingPerQtl != null 
      ? userCustomCosts.handlingPerQtl 
      : (market.standard_handling_per_qtl || 18.0);

    const commissionPct = userCustomCosts.commissionPct != null 
      ? userCustomCosts.commissionPct 
      : (market.standard_commission_pct || 2.0);

    const marketCessPct = userCustomCosts.marketCessPct != null 
      ? userCustomCosts.marketCessPct 
      : (market.market_cess_pct || 1.0);

    const packagingPerQtl = userCustomCosts.packagingPerQtl != null 
      ? userCustomCosts.packagingPerQtl 
      : 20.0;

    const qualityDeductionPerQtl = userCustomCosts.qualityDeductionPerQtl != null 
      ? userCustomCosts.qualityDeductionPerQtl 
      : 0.0;

    const netCalc = calculateNetReturn({
      headlinePrice: quote.modal_price,
      volumeQtl,
      distanceKm,
      transportRatePerKmQtl: transportRate,
      handlingPerQtl,
      commissionPct,
      marketCessPct,
      packagingPerQtl,
      qualityDeductionPerQtl
    });

    return {
      quoteId: quote.id,
      marketId: market.id,
      marketName: market.name,
      marketType: market.type,
      location: `${market.district}, ${market.state}`,
      distanceKm,
      source: quote.source,
      quoteDate: quote.quote_date,
      isStale: quote.is_stale || false,
      stalenessHours: quote.age_hours || 0,
      stalenessLevel: quote.staleness_level || 'FRESH',
      isVerified: quote.is_verified,
      arrivalVolume: quote.arrival_volume_qtl,
      headlinePrice: quote.modal_price,
      minPrice: quote.min_price,
      maxPrice: quote.max_price,
      ...netCalc
    };
  });

  // Sort descending by netPricePerQtl
  results.sort((a, b) => b.netPricePerQtl - a.netPricePerQtl);

  // Assign ranks and net advantage vs runner-up and vs nearest
  const best = results[0];
  const runnerUp = results[1] || best;

  // Find the nearest market by distance
  const nearest = [...results].sort((a, b) => a.distanceKm - b.distanceKm)[0];

  results.forEach((item, index) => {
    item.rank = index + 1;
    item.isBestNet = index === 0;
    item.diffVsBestNet = Math.round((item.netPricePerQtl - best.netPricePerQtl) * 100) / 100;
    item.diffTotalVsBest = Math.round((item.netReturn - best.netReturn) * 100) / 100;
    
    // Advantage vs nearest market
    item.advantageVsNearest = Math.round((item.netReturn - nearest.netReturn) * 100) / 100;
    
    // Generate actionable grower takeaway
    if (index === 0) {
      if (best.marketId === nearest.marketId) {
        item.takeaway = 'Top Choice: Local market yields the highest net return with zero transit hassle.';
      } else {
        const netDiff = Math.round((best.netReturn - nearest.netReturn));
        item.takeaway = `Top Choice: Yields +₹${netDiff.toLocaleString()} higher net return than local market even after accounting for ${best.distanceKm} km freight.`;
      }
    } else {
      if (item.headlinePrice > best.headlinePrice) {
        const illusionGap = Math.round((item.headlinePrice - best.headlinePrice) * volumeQtl);
        const netLoss = Math.round(best.netReturn - item.netReturn);
        item.takeaway = `Deceptive Headline: Raw quote is ₹${item.headlinePrice}/qtl (+₹${item.headlinePrice - best.headlinePrice}), but excessive freight & mandi fees cause a net loss of -₹${netLoss.toLocaleString()} compared to ${best.marketName}.`;
      } else {
        item.takeaway = `Lower net return (-₹${Math.abs(item.diffTotalVsBest).toLocaleString()} vs best option).`;
      }
    }
  });

  return {
    results,
    winner: best,
    runnerUp,
    nearest,
    volumeQtl,
    bestNetPricePerQtl: best ? best.netPricePerQtl : 0,
    maxNetAdvantage: best ? Math.max(0, best.netReturn - nearest.netReturn) : 0
  };
}

module.exports = {
  calculateNetReturn,
  compareMarkets
};
