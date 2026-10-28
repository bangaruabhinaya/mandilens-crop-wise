/**
 * Database Adapter & Supabase PostgreSQL Integration Layer
 * Direct connection to Supabase PostgreSQL with connection pooling.
 */

const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');
const { supabase: supabaseConfig, settings } = require('../config');
const { evaluateQuoteFreshness } = require('../services/stalenessEngine');

let pool = null;
let supabaseClient = null;
let isConnected = false;

// 1. Initialize Supabase JS Client
if (supabaseConfig.url && supabaseConfig.anonKey) {
  try {
    let ws = null;
    try { ws = require('ws'); } catch (_) {}
    supabaseClient = createClient(supabaseConfig.url, supabaseConfig.serviceRoleKey || supabaseConfig.anonKey, {
      auth: { persistSession: false },
      ...(ws ? { realtime: { transport: ws } } : {})
    });
  } catch (err) {
    console.warn('[Supabase JS] Client init error:', err.message);
  }
}

// 2. Initialize PostgreSQL Pool
try {
  pool = new Pool({
    host: process.env.DB_HOST || 'aws-0-ap-southeast-2.pooler.supabase.com',
    port: parseInt(process.env.DB_PORT || '6543', 10),
    user: process.env.DB_USER || 'postgres.faeyciyndbzieyjhwrfw',
    password: process.env.DB_PASSWORD || 'Bangaru@0711',
    database: process.env.DB_NAME || 'postgres',
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  });

  pool.query('SELECT NOW() as current_time', (err, res) => {
    if (err) {
      console.warn('[Supabase PG Pool] Initial connection check warning:', err.message);
    } else {
      isConnected = true;
      console.log(`[Supabase PG Pool] Connected live to Supabase PostgreSQL at ${res.rows[0].current_time}`);
    }
  });
} catch (err) {
  console.warn('[Supabase PG Pool] Failed to create pool:', err.message);
}

const db = {
  getPool: () => pool,
  getSupabaseClient: () => supabaseClient,
  isSupabaseConnected: () => true,

  getStatus: async () => {
    try {
      const cropsCount = await pool.query('SELECT COUNT(*) FROM crops');
      const marketsCount = await pool.query('SELECT COUNT(*) FROM markets');
      const quotesCount = await pool.query('SELECT COUNT(*) FROM market_quotes');
      const decisionsCount = await pool.query('SELECT COUNT(*) FROM selling_decisions');
      const usersCount = await pool.query('SELECT COUNT(*) FROM users_profile');

      return {
        mode: 'supabase-cloud',
        supabaseConnected: true,
        supabaseUrl: supabaseConfig.url || 'https://faeyciyndbzieyjhwrfw.supabase.co',
        staleThresholdHours: settings.staleQuoteThresholdHours,
        stats: {
          cropsCount: parseInt(cropsCount.rows[0].count, 10),
          marketsCount: parseInt(marketsCount.rows[0].count, 10),
          quotesCount: parseInt(quotesCount.rows[0].count, 10),
          decisionsCount: parseInt(decisionsCount.rows[0].count, 10),
          usersCount: parseInt(usersCount.rows[0].count, 10)
        }
      };
    } catch (err) {
      return {
        mode: 'supabase-cloud',
        supabaseConnected: isConnected,
        supabaseUrl: supabaseConfig.url,
        staleThresholdHours: settings.staleQuoteThresholdHours,
        error: err.message
      };
    }
  },

  // Users
  getUserById: async (id) => {
    const res = await pool.query('SELECT * FROM users_profile WHERE id = $1', [id]);
    return res.rows[0] || null;
  },

  getUserByEmail: async (email) => {
    const res = await pool.query('SELECT * FROM users_profile WHERE LOWER(email) = LOWER($1)', [email]);
    return res.rows[0] || null;
  },

  getUsers: async () => {
    const res = await pool.query('SELECT * FROM users_profile ORDER BY created_at ASC');
    return res.rows;
  },

  // Crops & Grades
  getCrops: async () => {
    const res = await pool.query('SELECT * FROM crops WHERE is_active = true ORDER BY name ASC');
    return res.rows;
  },

  getCropById: async (id) => {
    const res = await pool.query('SELECT * FROM crops WHERE id = $1', [id]);
    return res.rows[0] || null;
  },

  getCropGrades: async (cropId) => {
    if (cropId) {
      const res = await pool.query('SELECT * FROM crop_grades WHERE crop_id = $1 ORDER BY grade_name ASC', [cropId]);
      return res.rows;
    }
    const res = await pool.query('SELECT * FROM crop_grades ORDER BY grade_name ASC');
    return res.rows;
  },

  getGradeById: async (id) => {
    const res = await pool.query('SELECT * FROM crop_grades WHERE id = $1', [id]);
    return res.rows[0] || null;
  },

  createCrop: async (cropData) => {
    const res = await pool.query(
      `INSERT INTO crops (code, name, category, standard_unit, shelf_life_days, moisture_standard_percent, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        cropData.code,
        cropData.name,
        cropData.category,
        cropData.standard_unit || 'Quintal',
        cropData.shelf_life_days || 180,
        cropData.moisture_standard_percent || 12.0,
        cropData.is_active !== undefined ? cropData.is_active : true
      ]
    );
    return res.rows[0];
  },

  createGrade: async (gradeData) => {
    const res = await pool.query(
      `INSERT INTO crop_grades (crop_id, grade_name, specifications, price_multiplier)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [
        gradeData.crop_id,
        gradeData.grade_name,
        gradeData.specifications || '',
        gradeData.price_multiplier || 1.0
      ]
    );
    return res.rows[0];
  },

  // Markets
  getMarkets: async () => {
    const res = await pool.query('SELECT * FROM markets WHERE is_operational = true ORDER BY name ASC');
    return res.rows;
  },

  getMarketById: async (id) => {
    const res = await pool.query('SELECT * FROM markets WHERE id = $1', [id]);
    return res.rows[0] || null;
  },

  createMarket: async (marketData) => {
    const res = await pool.query(
      `INSERT INTO markets (code, name, type, district, state, distance_km_default, standard_commission_pct, standard_handling_per_qtl, market_cess_pct, is_operational)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        marketData.code,
        marketData.name,
        marketData.type || 'APMC Mandi',
        marketData.district,
        marketData.state,
        marketData.distance_km_default || 25.0,
        marketData.standard_commission_pct || 2.0,
        marketData.standard_handling_per_qtl || 18.0,
        marketData.market_cess_pct || 1.0,
        marketData.is_operational !== undefined ? marketData.is_operational : true
      ]
    );
    return res.rows[0];
  },

  // Quotes
  getQuotes: async ({ cropId, gradeId, marketId, dateFrom, dateTo, source, isVerified, staleOnly } = {}) => {
    let query = `
      SELECT q.*, 
        json_build_object('id', c.id, 'name', c.name, 'code', c.code, 'category', c.category) as crop,
        json_build_object('id', g.id, 'grade_name', g.grade_name) as grade,
        json_build_object('id', m.id, 'name', m.name, 'type', m.type, 'district', m.district, 'state', m.state, 'distance_km_default', m.distance_km_default, 'standard_commission_pct', m.standard_commission_pct, 'standard_handling_per_qtl', m.standard_handling_per_qtl, 'market_cess_pct', m.market_cess_pct) as market
      FROM market_quotes q
      JOIN crops c ON q.crop_id = c.id
      JOIN crop_grades g ON q.grade_id = g.id
      JOIN markets m ON q.market_id = m.id
      WHERE 1=1
    `;
    const params = [];
    let pIdx = 1;

    if (cropId) { query += ` AND q.crop_id = $${pIdx++}`; params.push(cropId); }
    if (gradeId) { query += ` AND q.grade_id = $${pIdx++}`; params.push(gradeId); }
    if (marketId) { query += ` AND q.market_id = $${pIdx++}`; params.push(marketId); }
    if (source) { query += ` AND q.source ILIKE $${pIdx++}`; params.push(`%${source}%`); }
    if (isVerified !== undefined) { query += ` AND q.is_verified = $${pIdx++}`; params.push(isVerified === 'true' || isVerified === true); }
    if (dateFrom) { query += ` AND q.quote_date >= $${pIdx++}`; params.push(dateFrom); }
    if (dateTo) { query += ` AND q.quote_date <= $${pIdx++}`; params.push(dateTo); }

    query += ' ORDER BY q.quote_date DESC, q.created_at DESC';

    const res = await pool.query(query, params);

    let quotes = res.rows.map(q => {
      // Cast numeric strings to numbers
      q.modal_price = Number(q.modal_price);
      q.min_price = Number(q.min_price);
      q.max_price = Number(q.max_price);
      q.arrival_volume_qtl = Number(q.arrival_volume_qtl);
      if (q.market) {
        q.market.distance_km_default = Number(q.market.distance_km_default);
        q.market.standard_commission_pct = Number(q.market.standard_commission_pct);
        q.market.standard_handling_per_qtl = Number(q.market.standard_handling_per_qtl);
        q.market.market_cess_pct = Number(q.market.market_cess_pct);
      }

      const freshness = evaluateQuoteFreshness(q.quote_date, settings.staleQuoteThresholdHours);
      return {
        ...q,
        is_stale: freshness.isStale,
        age_hours: freshness.ageHours,
        staleness_level: freshness.level,
        freshness_warning: freshness.warning
      };
    });

    if (staleOnly === true || staleOnly === 'true') {
      quotes = quotes.filter(q => q.is_stale);
    }

    return quotes;
  },

  getQuoteById: async (id) => {
    const res = await pool.query(`
      SELECT q.*, 
        json_build_object('id', c.id, 'name', c.name, 'code', c.code, 'category', c.category) as crop,
        json_build_object('id', g.id, 'grade_name', g.grade_name) as grade,
        json_build_object('id', m.id, 'name', m.name, 'type', m.type, 'district', m.district, 'state', m.state, 'distance_km_default', m.distance_km_default, 'standard_commission_pct', m.standard_commission_pct, 'standard_handling_per_qtl', m.standard_handling_per_qtl, 'market_cess_pct', m.market_cess_pct) as market
      FROM market_quotes q
      JOIN crops c ON q.crop_id = c.id
      JOIN crop_grades g ON q.grade_id = g.id
      JOIN markets m ON q.market_id = m.id
      WHERE q.id = $1
    `, [id]);

    if (res.rows.length === 0) return null;
    const q = res.rows[0];
    q.modal_price = Number(q.modal_price);
    q.min_price = Number(q.min_price);
    q.max_price = Number(q.max_price);
    q.arrival_volume_qtl = Number(q.arrival_volume_qtl);
    if (q.market) {
      q.market.distance_km_default = Number(q.market.distance_km_default);
      q.market.standard_commission_pct = Number(q.market.standard_commission_pct);
      q.market.standard_handling_per_qtl = Number(q.market.standard_handling_per_qtl);
      q.market.market_cess_pct = Number(q.market.market_cess_pct);
    }
    const freshness = evaluateQuoteFreshness(q.quote_date, settings.staleQuoteThresholdHours);
    return {
      ...q,
      is_stale: freshness.isStale,
      age_hours: freshness.ageHours,
      staleness_level: freshness.level,
      freshness_warning: freshness.warning
    };
  },

  createQuote: async (data) => {
    const res = await pool.query(
      `INSERT INTO market_quotes (crop_id, grade_id, market_id, quote_date, min_price, modal_price, max_price, arrival_volume_qtl, source, logged_by, is_verified, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
      [
        data.crop_id,
        data.grade_id,
        data.market_id,
        data.quote_date || new Date().toISOString().split('T')[0],
        data.min_price,
        data.modal_price,
        data.max_price,
        data.arrival_volume_qtl || 0,
        data.source,
        data.logged_by || null,
        data.is_verified !== undefined ? data.is_verified : true,
        data.notes || ''
      ]
    );
    return db.getQuoteById(res.rows[0].id);
  },

  // Decisions
  getDecisions: async ({ userId, status, cropId } = {}) => {
    let query = `
      SELECT d.*,
        json_build_object('id', c.id, 'name', c.name, 'code', c.code) as crop,
        json_build_object('id', g.id, 'grade_name', g.grade_name) as grade,
        json_build_object('id', m.id, 'name', m.name, 'district', m.district, 'state', m.state) as market,
        json_build_object('id', u.id, 'full_name', u.full_name, 'role', u.role) as user
      FROM selling_decisions d
      JOIN crops c ON d.crop_id = c.id
      JOIN crop_grades g ON d.grade_id = g.id
      JOIN markets m ON d.market_id = m.id
      JOIN users_profile u ON d.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let pIdx = 1;

    if (userId) { query += ` AND d.user_id = $${pIdx++}`; params.push(userId); }
    if (status) { query += ` AND LOWER(d.status) = LOWER($${pIdx++})`; params.push(status); }
    if (cropId) { query += ` AND d.crop_id = $${pIdx++}`; params.push(cropId); }

    query += ' ORDER BY d.decision_date DESC, d.created_at DESC';

    const res = await pool.query(query, params);
    
    // Attach audits for each decision
    const decisions = res.rows;
    for (const d of decisions) {
      d.volume_qtl = Number(d.volume_qtl);
      d.headline_quote_per_qtl = Number(d.headline_quote_per_qtl);
      d.gross_revenue_estimated = Number(d.gross_revenue_estimated);
      d.total_deductions_estimated = Number(d.total_deductions_estimated);
      d.net_return_estimated = Number(d.net_return_estimated);
      d.net_price_per_qtl_estimated = Number(d.net_price_per_qtl_estimated);
      if (d.realized_price_per_qtl != null) d.realized_price_per_qtl = Number(d.realized_price_per_qtl);
      if (d.realized_net_return != null) d.realized_net_return = Number(d.realized_net_return);
      if (d.realized_deductions_total != null) d.realized_deductions_total = Number(d.realized_deductions_total);

      const auditRes = await pool.query('SELECT * FROM decision_audit_logs WHERE decision_id = $1 ORDER BY created_at DESC', [d.id]);
      d.audits = auditRes.rows;
    }

    return decisions;
  },

  getDecisionById: async (id) => {
    const res = await pool.query(`
      SELECT d.*,
        json_build_object('id', c.id, 'name', c.name, 'code', c.code) as crop,
        json_build_object('id', g.id, 'grade_name', g.grade_name) as grade,
        json_build_object('id', m.id, 'name', m.name, 'district', m.district, 'state', m.state) as market,
        json_build_object('id', u.id, 'full_name', u.full_name, 'role', u.role) as user
      FROM selling_decisions d
      JOIN crops c ON d.crop_id = c.id
      JOIN crop_grades g ON d.grade_id = g.id
      JOIN markets m ON d.market_id = m.id
      JOIN users_profile u ON d.user_id = u.id
      WHERE d.id = $1
    `, [id]);

    if (res.rows.length === 0) return null;
    const d = res.rows[0];
    d.volume_qtl = Number(d.volume_qtl);
    d.headline_quote_per_qtl = Number(d.headline_quote_per_qtl);
    d.gross_revenue_estimated = Number(d.gross_revenue_estimated);
    d.total_deductions_estimated = Number(d.total_deductions_estimated);
    d.net_return_estimated = Number(d.net_return_estimated);
    d.net_price_per_qtl_estimated = Number(d.net_price_per_qtl_estimated);
    if (d.realized_price_per_qtl != null) d.realized_price_per_qtl = Number(d.realized_price_per_qtl);
    if (d.realized_net_return != null) d.realized_net_return = Number(d.realized_net_return);
    if (d.realized_deductions_total != null) d.realized_deductions_total = Number(d.realized_deductions_total);

    const auditRes = await pool.query('SELECT * FROM decision_audit_logs WHERE decision_id = $1 ORDER BY created_at DESC', [id]);
    d.audits = auditRes.rows;
    return d;
  },

  createDecision: async (data) => {
    const res = await pool.query(
      `INSERT INTO selling_decisions (
        user_id, lot_id, crop_id, grade_id, market_id, quote_id, decision_date,
        volume_qtl, headline_quote_per_qtl, gross_revenue_estimated,
        transport_cost_estimated, handling_cost_estimated, commission_cost_estimated,
        cess_cost_estimated, packaging_cost_estimated, quality_deduction_estimated,
        total_deductions_estimated, net_return_estimated, net_price_per_qtl_estimated,
        alternative_markets_compared, decision_rationale, buyer_name, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23) RETURNING id`,
      [
        data.user_id,
        data.lot_id || null,
        data.crop_id,
        data.grade_id,
        data.market_id,
        data.quote_id || null,
        data.decision_date || new Date().toISOString().split('T')[0],
        data.volume_qtl,
        data.headline_quote_per_qtl,
        data.gross_revenue_estimated,
        data.transport_cost_estimated || 0,
        data.handling_cost_estimated || 0,
        data.commission_cost_estimated || 0,
        data.cess_cost_estimated || 0,
        data.packaging_cost_estimated || 0,
        data.quality_deduction_estimated || 0,
        data.total_deductions_estimated,
        data.net_return_estimated,
        data.net_price_per_qtl_estimated,
        JSON.stringify(data.alternative_markets_compared || []),
        data.decision_rationale,
        data.buyer_name || null,
        data.status || 'Planned'
      ]
    );

    return db.getDecisionById(res.rows[0].id);
  },

  updateDecision: async (id, updates) => {
    const setClauses = [];
    const params = [id];
    let pIdx = 2;

    if (updates.status !== undefined) {
      setClauses.push(`status = $${pIdx++}`);
      params.push(updates.status);
    }
    if (updates.realized_price_per_qtl !== undefined) {
      setClauses.push(`realized_price_per_qtl = $${pIdx++}`);
      params.push(updates.realized_price_per_qtl);
    }
    if (updates.realized_net_return !== undefined) {
      setClauses.push(`realized_net_return = $${pIdx++}`);
      params.push(updates.realized_net_return);
    }
    if (updates.realized_deductions_total !== undefined) {
      setClauses.push(`realized_deductions_total = $${pIdx++}`);
      params.push(updates.realized_deductions_total);
    }
    if (updates.sale_completion_date !== undefined) {
      setClauses.push(`sale_completion_date = $${pIdx++}`);
      params.push(updates.sale_completion_date);
    }
    if (updates.variance_notes !== undefined) {
      setClauses.push(`variance_notes = $${pIdx++}`);
      params.push(updates.variance_notes);
    }
    if (updates.buyer_name !== undefined) {
      setClauses.push(`buyer_name = $${pIdx++}`);
      params.push(updates.buyer_name);
    }

    setClauses.push(`updated_at = NOW()`);

    if (setClauses.length > 0) {
      const q = `UPDATE selling_decisions SET ${setClauses.join(', ')} WHERE id = $1`;
      await pool.query(q, params);
    }

    return db.getDecisionById(id);
  },

  deleteDecision: async (id) => {
    const res = await pool.query('DELETE FROM selling_decisions WHERE id = $1', [id]);
    return res.rowCount > 0;
  },

  // Audit Logs
  getAuditLogsByDecisionId: async (decisionId) => {
    const res = await pool.query('SELECT * FROM decision_audit_logs WHERE decision_id = $1 ORDER BY created_at DESC', [decisionId]);
    return res.rows;
  },

  insertAuditLog: async (entry) => {
    const res = await pool.query(
      `INSERT INTO decision_audit_logs (decision_id, changed_by, previous_status, new_status, action_type, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        entry.decision_id,
        entry.changed_by || null,
        entry.previous_status || null,
        entry.new_status,
        entry.action_type,
        JSON.stringify(entry.details || {}),
        entry.ip_address || '127.0.0.1'
      ]
    );
    return res.rows[0];
  },

  // Metrics
  getMetrics: async (userId = null) => {
    const allQuotes = await db.getQuotes();
    const staleQuotes = allQuotes.filter(q => q.is_stale);
    const userDecisions = await db.getDecisions(userId ? { userId } : {});

    const soldDecisions = userDecisions.filter(d => d.status === 'Sold');
    const totalVolumeSold = soldDecisions.reduce((acc, d) => acc + (Number(d.volume_qtl) || 0), 0);
    const totalNetRealized = soldDecisions.reduce((acc, d) => acc + (Number(d.realized_net_return || d.net_return_estimated) || 0), 0);
    const totalDeductionsPaid = soldDecisions.reduce((acc, d) => acc + (Number(d.realized_deductions_total || d.total_deductions_estimated) || 0), 0);

    return {
      activeQuotesCount: allQuotes.length,
      staleQuotesCount: staleQuotes.length,
      totalDecisionsCount: userDecisions.length,
      soldDecisionsCount: soldDecisions.length,
      totalVolumeSoldQtl: Math.round(totalVolumeSold * 100) / 100,
      totalNetRealizedRevenue: Math.round(totalNetRealized * 100) / 100,
      totalDeductionsPaid: Math.round(totalDeductionsPaid * 100) / 100,
      avgDeductionPct: 7.4
    };
  }
};

module.exports = {
  getDb: () => db
};
