const { getDb } = require('../models/db');

/**
 * Helper to escape CSV values
 */
function escapeCsv(val) {
  if (val == null) return '';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Export Market Quotes as CSV
 */
async function exportQuotesCsv(req, res, next) {
  try {
    const db = getDb();
    const quotes = await db.getQuotes();

    const headers = [
      'Quote ID',
      'Quote Date',
      'Crop Name',
      'Grade Name',
      'Market Name',
      'Market District',
      'Market State',
      'Modal Price (INR/Qtl)',
      'Min Price',
      'Max Price',
      'Arrival Volume (Qtl)',
      'Source',
      'Stale Flag',
      'Age (Hours)',
      'Verified'
    ];

    const rows = quotes.map(q => [
      escapeCsv(q.id),
      escapeCsv(q.quote_date),
      escapeCsv(q.crop ? q.crop.name : ''),
      escapeCsv(q.grade ? q.grade.grade_name : ''),
      escapeCsv(q.market ? q.market.name : ''),
      escapeCsv(q.market ? q.market.district : ''),
      escapeCsv(q.market ? q.market.state : ''),
      q.modal_price,
      q.min_price,
      q.max_price,
      q.arrival_volume_qtl,
      escapeCsv(q.source),
      q.is_stale ? 'YES' : 'NO',
      q.age_hours,
      q.is_verified ? 'YES' : 'NO'
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="crop_market_quotes.csv"');
    res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
}

/**
 * Export Selling Decisions as CSV
 */
async function exportDecisionsCsv(req, res, next) {
  try {
    const db = getDb();
    const userId = req.user && req.user.role !== 'admin' ? req.user.id : null;
    const decisions = await db.getDecisions({ userId });

    const headers = [
      'Decision ID',
      'Decision Date',
      'Crop Name',
      'Grade Name',
      'Target Market',
      'Volume (Qtl)',
      'Headline Price (INR/Qtl)',
      'Gross Revenue (INR)',
      'Transport Cost (INR)',
      'Handling Hamali (INR)',
      'Commission Cost (INR)',
      'Mandi Cess (INR)',
      'Packaging Cost (INR)',
      'Quality Deduction (INR)',
      'Total Deductions (INR)',
      'Estimated Net Return (INR)',
      'Estimated Net Price/Qtl (INR)',
      'Status',
      'Buyer Name',
      'Realized Price/Qtl',
      'Realized Net Return',
      'Variance Notes',
      'Rationale'
    ];

    const rows = decisions.map(d => [
      escapeCsv(d.id),
      escapeCsv(d.decision_date),
      escapeCsv(d.crop ? d.crop.name : ''),
      escapeCsv(d.grade ? d.grade.grade_name : ''),
      escapeCsv(d.market ? d.market.name : ''),
      d.volume_qtl,
      d.headline_quote_per_qtl,
      d.gross_revenue_estimated,
      d.transport_cost_estimated,
      d.handling_cost_estimated,
      d.commission_cost_estimated,
      d.cess_cost_estimated,
      d.packaging_cost_estimated,
      d.quality_deduction_estimated,
      d.total_deductions_estimated,
      d.net_return_estimated,
      d.net_price_per_qtl_estimated,
      escapeCsv(d.status),
      escapeCsv(d.buyer_name || ''),
      d.realized_price_per_qtl || '',
      d.realized_net_return || '',
      escapeCsv(d.variance_notes || ''),
      escapeCsv(d.decision_rationale)
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="grower_selling_decisions.csv"');
    res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
}

/**
 * Import Quotes from CSV Text/Payload
 * Accepts raw CSV text in req.body.csv_text or rows
 */
async function importQuotesCsv(req, res, next) {
  try {
    const { csv_text } = req.body;
    if (!csv_text || typeof csv_text !== 'string' || !csv_text.trim()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Missing csv_text in request body.', code: 'MISSING_DATA' }
      });
    }

    const db = getDb();
    const crops = await db.getCrops();
    const markets = await db.getMarkets();

    const lines = csv_text.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) {
      return res.status(400).json({
        success: false,
        error: { message: 'CSV must contain at least a header and one data row.', code: 'EMPTY_CSV' }
      });
    }

    const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
    // Expected fields: crop, grade, market, modal_price (or price), source, quote_date (optional)
    const cropIdx = header.findIndex(h => h.includes('crop'));
    const gradeIdx = header.findIndex(h => h.includes('grade'));
    const marketIdx = header.findIndex(h => h.includes('market'));
    const modalIdx = header.findIndex(h => h.includes('modal') || h.includes('price'));
    const minIdx = header.findIndex(h => h.includes('min'));
    const maxIdx = header.findIndex(h => h.includes('max'));
    const volIdx = header.findIndex(h => h.includes('arrival') || h.includes('volume'));
    const sourceIdx = header.findIndex(h => h.includes('source'));
    const dateIdx = header.findIndex(h => h.includes('date'));

    if (cropIdx === -1 || marketIdx === -1 || modalIdx === -1) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'CSV header must contain columns for Crop, Market, and Modal Price (or Price).',
          code: 'INVALID_HEADER',
          detectedColumns: header
        }
      });
    }

    const imported = [];
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      const lineNum = i + 1;
      const rawCols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      if (rawCols.length < 3) continue;

      const rawCrop = rawCols[cropIdx] || '';
      const rawGrade = gradeIdx !== -1 ? rawCols[gradeIdx] : '';
      const rawMarket = rawCols[marketIdx] || '';
      const rawModal = parseFloat(rawCols[modalIdx]);
      const rawMin = minIdx !== -1 && !isNaN(parseFloat(rawCols[minIdx])) ? parseFloat(rawCols[minIdx]) : rawModal;
      const rawMax = maxIdx !== -1 && !isNaN(parseFloat(rawCols[maxIdx])) ? parseFloat(rawCols[maxIdx]) : rawModal;
      const rawVol = volIdx !== -1 && !isNaN(parseFloat(rawCols[volIdx])) ? parseFloat(rawCols[volIdx]) : 1000;
      const rawSource = sourceIdx !== -1 && rawCols[sourceIdx] ? rawCols[sourceIdx] : 'CSV Batch Import';
      const rawDate = dateIdx !== -1 && rawCols[dateIdx] ? rawCols[dateIdx] : new Date().toISOString().split('T')[0];

      // Match crop
      const matchedCrop = crops.find(c => 
        c.name.toLowerCase().includes(rawCrop.toLowerCase()) || 
        c.code.toLowerCase() === rawCrop.toLowerCase()
      );

      if (!matchedCrop) {
        errors.push({ line: lineNum, reason: `Unrecognized crop "${rawCrop}"` });
        continue;
      }

      // Match grade
      const grades = await db.getCropGrades(matchedCrop.id);
      let matchedGrade = grades.find(g => 
        rawGrade && g.grade_name.toLowerCase().includes(rawGrade.toLowerCase())
      );
      if (!matchedGrade && grades.length > 0) {
        matchedGrade = grades[0]; // Default to primary grade
      }

      if (!matchedGrade) {
        errors.push({ line: lineNum, reason: `No grades defined for crop "${rawCrop}"` });
        continue;
      }

      // Match market
      const matchedMarket = markets.find(m => 
        m.name.toLowerCase().includes(rawMarket.toLowerCase()) ||
        m.code.toLowerCase() === rawMarket.toLowerCase() ||
        m.district.toLowerCase() === rawMarket.toLowerCase()
      );

      if (!matchedMarket) {
        errors.push({ line: lineNum, reason: `Unrecognized market/mandi "${rawMarket}"` });
        continue;
      }

      if (isNaN(rawModal) || rawModal <= 0) {
        errors.push({ line: lineNum, reason: `Invalid modal price "${rawCols[modalIdx]}"` });
        continue;
      }

      // Insert valid quote
      const created = await db.createQuote({
        crop_id: matchedCrop.id,
        grade_id: matchedGrade.id,
        market_id: matchedMarket.id,
        modal_price: rawModal,
        min_price: rawMin,
        max_price: rawMax,
        arrival_volume_qtl: rawVol,
        source: rawSource,
        quote_date: rawDate,
        logged_by: req.user ? req.user.id : null,
        is_verified: true,
        notes: `Imported via CSV on ${new Date().toLocaleDateString()}`
      });

      imported.push({
        id: created.id,
        crop: matchedCrop.name,
        market: matchedMarket.name,
        price: rawModal,
        quoteDate: rawDate
      });
    }

    res.json({
      success: true,
      summary: {
        totalRowsProcessed: lines.length - 1,
        successCount: imported.length,
        errorCount: errors.length
      },
      imported,
      errors
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  exportQuotesCsv,
  exportDecisionsCsv,
  importQuotesCsv
};
