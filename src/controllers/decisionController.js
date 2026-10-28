const { getDb } = require('../models/db');
const { calculateNetReturn } = require('../services/netReturnEngine');
const { recordDecisionAudit } = require('../services/auditService');

async function getDecisions(req, res, next) {
  try {
    const { status, crop_id } = req.query;
    const db = getDb();
    const userId = req.user && req.user.role !== 'admin' ? req.user.id : null;

    const decisions = await db.getDecisions({
      userId,
      status,
      cropId: crop_id
    });

    res.json({
      success: true,
      count: decisions.length,
      data: decisions
    });
  } catch (err) {
    next(err);
  }
}

async function getDecisionById(req, res, next) {
  try {
    const { id } = req.params;
    const db = getDb();
    const decision = await db.getDecisionById(id);

    if (!decision) {
      return res.status(404).json({
        success: false,
        error: { message: 'Selling decision record not found', code: 'NOT_FOUND' }
      });
    }

    // Role boundary check: regular users can only see their own decisions
    if (req.user && req.user.role === 'farmer' && decision.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: { message: 'Access denied: You cannot view another grower\'s selling decision.', code: 'FORBIDDEN' }
      });
    }

    res.json({
      success: true,
      data: decision
    });
  } catch (err) {
    next(err);
  }
}

async function createDecision(req, res, next) {
  try {
    const {
      lot_id,
      crop_id,
      grade_id,
      market_id,
      quote_id,
      decision_date,
      volume_qtl,
      headline_quote_per_qtl,
      transport_cost_estimated,
      handling_cost_estimated,
      commission_cost_estimated,
      cess_cost_estimated,
      packaging_cost_estimated,
      quality_deduction_estimated,
      alternative_markets_compared = [],
      decision_rationale,
      buyer_name,
      status = 'Planned'
    } = req.body;

    const db = getDb();
    const userId = req.user ? req.user.id : 'a0000000-0000-0000-0000-000000000001';

    const vol = Number(volume_qtl);
    const headlinePrice = Number(headline_quote_per_qtl);
    const grossRevenue = Math.round(vol * headlinePrice * 100) / 100;

    const tCost = Number(transport_cost_estimated) || 0;
    const hCost = Number(handling_cost_estimated) || 0;
    const cCost = Number(commission_cost_estimated) || 0;
    const cessCost = Number(cess_cost_estimated) || 0;
    const pCost = Number(packaging_cost_estimated) || 0;
    const qCost = Number(quality_deduction_estimated) || 0;

    const totalDeductions = Math.round((tCost + hCost + cCost + cessCost + pCost + qCost) * 100) / 100;
    const netReturn = Math.round((grossRevenue - totalDeductions) * 100) / 100;
    const netPricePerQtl = Math.round((netReturn / vol) * 100) / 100;

    const decisionRecord = await db.createDecision({
      user_id: userId,
      lot_id: lot_id || null,
      crop_id,
      grade_id,
      market_id,
      quote_id: quote_id || null,
      decision_date: decision_date || new Date().toISOString().split('T')[0],
      volume_qtl: vol,
      headline_quote_per_qtl: headlinePrice,
      gross_revenue_estimated: grossRevenue,
      transport_cost_estimated: tCost,
      handling_cost_estimated: hCost,
      commission_cost_estimated: cCost,
      cess_cost_estimated: cessCost,
      packaging_cost_estimated: pCost,
      quality_deduction_estimated: qCost,
      total_deductions_estimated: totalDeductions,
      net_return_estimated: netReturn,
      net_price_per_qtl_estimated: netPricePerQtl,
      alternative_markets_compared,
      decision_rationale: decision_rationale.trim(),
      buyer_name: buyer_name ? buyer_name.trim() : null,
      status
    });

    // Record audit event
    await recordDecisionAudit({
      decisionId: decisionRecord.id,
      userId,
      previousStatus: null,
      newStatus: status,
      actionType: 'DECISION_CREATED',
      details: {
        volume_qtl: vol,
        net_price_per_qtl: netPricePerQtl,
        rationale: decision_rationale
      },
      ipAddress: req.ip || '127.0.0.1'
    });

    res.status(201).json({
      success: true,
      message: 'Selling decision recorded successfully in your decision log.',
      data: decisionRecord
    });
  } catch (err) {
    next(err);
  }
}

async function updateDecision(req, res, next) {
  try {
    const { id } = req.params;
    const db = getDb();
    const existing = await db.getDecisionById(id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { message: 'Decision record not found', code: 'NOT_FOUND' }
      });
    }

    // Role check: Only owner or admin can update
    if (req.user && req.user.role === 'farmer' && existing.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: { message: 'Forbidden: You do not own this decision record.', code: 'FORBIDDEN' }
      });
    }

    const {
      status,
      realized_price_per_qtl,
      realized_deductions_total,
      sale_completion_date,
      variance_notes,
      buyer_name,
      decision_rationale
    } = req.body;

    const updates = {};
    if (buyer_name !== undefined) updates.buyer_name = buyer_name;
    if (decision_rationale !== undefined) updates.decision_rationale = decision_rationale;

    // Handle Status Transition
    const prevStatus = existing.status;
    if (status && status !== prevStatus) {
      const allowedTransitions = ['Planned', 'Dispatched', 'Sold', 'Cancelled'];
      if (!allowedTransitions.includes(status)) {
        return res.status(400).json({
          success: false,
          error: { message: `Invalid status. Allowed values: ${allowedTransitions.join(', ')}`, code: 'INVALID_STATUS' }
        });
      }
      updates.status = status;
    }

    // Reconcile Realized Sale
    if (status === 'Sold' || realized_price_per_qtl != null) {
      const realizedPrice = Number(realized_price_per_qtl) || existing.headline_quote_per_qtl;
      const vol = existing.volume_qtl;
      const realizedGross = Math.round(realizedPrice * vol * 100) / 100;
      const realizedDeductions = realized_deductions_total != null 
        ? Number(realized_deductions_total) 
        : existing.total_deductions_estimated;
      const realizedNet = Math.round((realizedGross - realizedDeductions) * 100) / 100;

      updates.realized_price_per_qtl = realizedPrice;
      updates.realized_deductions_total = realizedDeductions;
      updates.realized_net_return = realizedNet;
      updates.sale_completion_date = sale_completion_date || new Date().toISOString().split('T')[0];
      if (variance_notes) updates.variance_notes = variance_notes;
    }

    const updated = await db.updateDecision(id, updates);

    // Record audit event
    await recordDecisionAudit({
      decisionId: id,
      userId: req.user ? req.user.id : null,
      previousStatus: prevStatus,
      newStatus: updates.status || prevStatus,
      actionType: status === 'Sold' ? 'SALE_RECONCILED' : 'STATUS_CHANGE',
      details: {
        updates,
        variance_notes: updates.variance_notes || null
      },
      ipAddress: req.ip || '127.0.0.1'
    });

    res.json({
      success: true,
      message: 'Decision record updated successfully.',
      data: updated
    });
  } catch (err) {
    next(err);
  }
}

async function deleteDecision(req, res, next) {
  try {
    const { id } = req.params;
    const db = getDb();
    const existing = await db.getDecisionById(id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { message: 'Decision record not found', code: 'NOT_FOUND' }
      });
    }

    if (req.user && req.user.role === 'farmer' && existing.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: { message: 'Forbidden: You cannot delete another grower\'s record.', code: 'FORBIDDEN' }
      });
    }

    await db.deleteDecision(id);
    res.json({
      success: true,
      message: 'Selling decision deleted.'
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDecisions,
  getDecisionById,
  createDecision,
  updateDecision,
  deleteDecision
};
