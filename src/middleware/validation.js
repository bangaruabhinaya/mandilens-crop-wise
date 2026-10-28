/**
 * Centralized Input Validation Middleware
 */

function validateQuoteInput(req, res, next) {
  const { crop_id, grade_id, market_id, modal_price, min_price, max_price, source } = req.body;
  const errors = [];

  if (!crop_id) errors.push('Crop selection is required.');
  if (!grade_id) errors.push('Grade selection is required.');
  if (!market_id) errors.push('Market selection is required.');
  if (!source || !source.trim()) errors.push('Quote source is required (e.g. APMC Bulletin, Trader Quote).');

  const modal = Number(modal_price);
  if (isNaN(modal) || modal <= 0) errors.push('Modal price must be a positive number.');

  const min = min_price != null ? Number(min_price) : modal;
  const max = max_price != null ? Number(max_price) : modal;

  if (min > modal) errors.push('Minimum price cannot exceed modal price.');
  if (max < modal) errors.push('Maximum price cannot be less than modal price.');

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed for market quote submission.',
        code: 'VALIDATION_ERROR',
        details: errors
      }
    });
  }

  req.sanitizedQuote = {
    crop_id,
    grade_id,
    market_id,
    modal_price: modal,
    min_price: min,
    max_price: max,
    arrival_volume_qtl: Number(req.body.arrival_volume_qtl) || 0,
    quote_date: req.body.quote_date || new Date().toISOString().split('T')[0],
    source: source.trim(),
    notes: req.body.notes ? req.body.notes.trim() : ''
  };

  next();
}

function validateDecisionInput(req, res, next) {
  const {
    crop_id,
    grade_id,
    market_id,
    volume_qtl,
    headline_quote_per_qtl,
    decision_rationale
  } = req.body;

  const errors = [];
  if (!crop_id) errors.push('Crop is required.');
  if (!grade_id) errors.push('Grade is required.');
  if (!market_id) errors.push('Chosen market is required.');

  const vol = Number(volume_qtl);
  if (isNaN(vol) || vol <= 0) errors.push('Lot volume in quintals must be greater than zero.');

  const price = Number(headline_quote_per_qtl);
  if (isNaN(price) || price <= 0) errors.push('Headline quote price must be greater than zero.');

  if (!decision_rationale || !decision_rationale.trim() || decision_rationale.trim().length < 5) {
    errors.push('A decision rationale is required (explain why this market was chosen).');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed for selling decision.',
        code: 'VALIDATION_ERROR',
        details: errors
      }
    });
  }

  next();
}

module.exports = {
  validateQuoteInput,
  validateDecisionInput
};
