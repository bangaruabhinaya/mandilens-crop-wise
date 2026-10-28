const { getDb } = require('../models/db');

async function getMarkets(req, res, next) {
  try {
    const db = getDb();
    const markets = await db.getMarkets();
    res.json({
      success: true,
      data: markets
    });
  } catch (err) {
    next(err);
  }
}

async function getMarketById(req, res, next) {
  try {
    const { id } = req.params;
    const db = getDb();
    const market = await db.getMarketById(id);
    if (!market) {
      return res.status(404).json({
        success: false,
        error: { message: 'Market not found', code: 'NOT_FOUND' }
      });
    }
    res.json({
      success: true,
      data: market
    });
  } catch (err) {
    next(err);
  }
}

async function createMarket(req, res, next) {
  try {
    const {
      name,
      type,
      district,
      state,
      distance_km_default,
      standard_commission_pct,
      standard_handling_per_qtl,
      market_cess_pct
    } = req.body;

    if (!name || !district || !state) {
      return res.status(400).json({
        success: false,
        error: { message: 'Market name, district, and state are required.', code: 'VALIDATION_ERROR' }
      });
    }

    const code = name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').substring(0, 40);
    const db = getDb();
    const market = await db.createMarket({
      code,
      name,
      type: type || 'APMC Mandi',
      district,
      state,
      distance_km_default: Number(distance_km_default) || 25,
      standard_commission_pct: Number(standard_commission_pct) || 2.0,
      standard_handling_per_qtl: Number(standard_handling_per_qtl) || 18.0,
      market_cess_pct: Number(market_cess_pct) || 1.0
    });

    res.status(201).json({
      success: true,
      message: 'Market added successfully',
      data: market
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMarkets,
  getMarketById,
  createMarket
};
