const { getDb } = require('../models/db');

async function getQuotes(req, res, next) {
  try {
    const {
      crop_id,
      grade_id,
      market_id,
      date_from,
      date_to,
      source,
      is_verified,
      stale_only,
      sort_by,
      sort_order
    } = req.query;

    const db = getDb();
    let quotes = await db.getQuotes({
      cropId: crop_id,
      gradeId: grade_id,
      marketId: market_id,
      dateFrom: date_from,
      dateTo: date_to,
      source,
      isVerified: is_verified,
      staleOnly: stale_only
    });

    // Custom sorting
    if (sort_by === 'price') {
      quotes.sort((a, b) => sort_order === 'asc' ? a.modal_price - b.modal_price : b.modal_price - a.modal_price);
    } else if (sort_by === 'market') {
      quotes.sort((a, b) => (a.market.name || '').localeCompare(b.market.name || ''));
    } else if (sort_by === 'crop') {
      quotes.sort((a, b) => (a.crop.name || '').localeCompare(b.crop.name || ''));
    }

    res.json({
      success: true,
      count: quotes.length,
      data: quotes
    });
  } catch (err) {
    next(err);
  }
}

async function getQuoteById(req, res, next) {
  try {
    const { id } = req.params;
    const db = getDb();
    const quote = await db.getQuoteById(id);
    if (!quote) {
      return res.status(404).json({
        success: false,
        error: { message: 'Quote not found', code: 'NOT_FOUND' }
      });
    }
    res.json({
      success: true,
      data: quote
    });
  } catch (err) {
    next(err);
  }
}

async function createQuote(req, res, next) {
  try {
    const quoteData = req.sanitizedQuote;
    const db = getDb();

    // Verify foreign keys exist
    const crop = await db.getCropById(quoteData.crop_id);
    if (!crop) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid crop_id: Crop not found', code: 'INVALID_REFERENCE' }
      });
    }

    const market = await db.getMarketById(quoteData.market_id);
    if (!market) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid market_id: Market not found', code: 'INVALID_REFERENCE' }
      });
    }

    const created = await db.createQuote({
      ...quoteData,
      logged_by: req.user ? req.user.id : null,
      is_verified: req.user && ['operator', 'admin'].includes(req.user.role)
    });

    res.status(201).json({
      success: true,
      message: 'Market quote submitted successfully',
      data: created
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getQuotes,
  getQuoteById,
  createQuote
};
