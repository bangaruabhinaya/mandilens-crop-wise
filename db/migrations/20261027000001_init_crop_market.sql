-- ==============================================================================
-- Crop-Wise Market Price Comparison and Selling Decision Log
-- Migration: 20261027000001_init_crop_market.sql
-- Description: Complete schema with constraints, indexes, and RLS policies
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USER PROFILES TABLE
CREATE TABLE IF NOT EXISTS users_profile (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'farmer' CHECK (role IN ('visitor', 'farmer', 'operator', 'admin')),
    phone VARCHAR(25),
    village_location VARCHAR(150),
    default_transport_rate_per_km_qtl NUMERIC(10, 2) DEFAULT 0.85,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CROPS TABLE
CREATE TABLE IF NOT EXISTS crops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('Cereals', 'Pulses', 'Oilseeds', 'Vegetables', 'Fruits', 'Fiber', 'Spices')),
    standard_unit VARCHAR(20) DEFAULT 'Quintal',
    shelf_life_days INT DEFAULT 180,
    moisture_standard_percent NUMERIC(5, 2) DEFAULT 12.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CROP GRADES TABLE
CREATE TABLE IF NOT EXISTS crop_grades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    crop_id UUID NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
    grade_name VARCHAR(50) NOT NULL,
    specifications TEXT,
    price_multiplier NUMERIC(4, 2) DEFAULT 1.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_crop_grade UNIQUE (crop_id, grade_name)
);

-- 4. MARKETS TABLE
CREATE TABLE IF NOT EXISTS markets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('APMC Mandi', 'Private Terminal', 'Farmer Producer Org (FPO)', 'e-NAM Center', 'Direct Processor/Mill')),
    district VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    distance_km_default NUMERIC(8, 2) DEFAULT 25.0,
    standard_commission_pct NUMERIC(5, 2) DEFAULT 2.0,
    standard_handling_per_qtl NUMERIC(8, 2) DEFAULT 18.0,
    market_cess_pct NUMERIC(5, 2) DEFAULT 1.0,
    is_operational BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. MARKET QUOTES TABLE
CREATE TABLE IF NOT EXISTS market_quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    crop_id UUID NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
    grade_id UUID NOT NULL REFERENCES crop_grades(id) ON DELETE CASCADE,
    market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
    quote_date DATE NOT NULL DEFAULT CURRENT_DATE,
    min_price NUMERIC(10, 2) NOT NULL CHECK (min_price > 0),
    modal_price NUMERIC(10, 2) NOT NULL CHECK (modal_price >= min_price),
    max_price NUMERIC(10, 2) NOT NULL CHECK (max_price >= modal_price),
    arrival_volume_qtl NUMERIC(12, 2) DEFAULT 0,
    source VARCHAR(100) NOT NULL,
    logged_by UUID REFERENCES users_profile(id) ON DELETE SET NULL,
    is_verified BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. GROWER LOTS TABLE
CREATE TABLE IF NOT EXISTS grower_lots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
    lot_number VARCHAR(50) NOT NULL,
    crop_id UUID NOT NULL REFERENCES crops(id) ON DELETE RESTRICT,
    grade_id UUID NOT NULL REFERENCES crop_grades(id) ON DELETE RESTRICT,
    quantity_qtl NUMERIC(10, 2) NOT NULL CHECK (quantity_qtl > 0),
    harvest_date DATE NOT NULL,
    storage_location VARCHAR(150),
    bag_count INT DEFAULT 0,
    estimated_cost_of_cultivation NUMERIC(12, 2) DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'Evaluating Markets' CHECK (status IN ('In Storage', 'Evaluating Markets', 'Committed', 'Sold')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_user_lot UNIQUE (user_id, lot_number)
);

-- 7. SELLING DECISIONS TABLE
CREATE TABLE IF NOT EXISTS selling_decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
    lot_id UUID REFERENCES grower_lots(id) ON DELETE SET NULL,
    crop_id UUID NOT NULL REFERENCES crops(id),
    grade_id UUID NOT NULL REFERENCES crop_grades(id),
    market_id UUID NOT NULL REFERENCES markets(id),
    quote_id UUID REFERENCES market_quotes(id) ON DELETE SET NULL,
    decision_date DATE NOT NULL DEFAULT CURRENT_DATE,
    volume_qtl NUMERIC(10, 2) NOT NULL CHECK (volume_qtl > 0),
    headline_quote_per_qtl NUMERIC(10, 2) NOT NULL CHECK (headline_quote_per_qtl > 0),
    gross_revenue_estimated NUMERIC(12, 2) NOT NULL,
    transport_cost_estimated NUMERIC(10, 2) NOT NULL DEFAULT 0,
    handling_cost_estimated NUMERIC(10, 2) NOT NULL DEFAULT 0,
    commission_cost_estimated NUMERIC(10, 2) NOT NULL DEFAULT 0,
    cess_cost_estimated NUMERIC(10, 2) NOT NULL DEFAULT 0,
    packaging_cost_estimated NUMERIC(10, 2) NOT NULL DEFAULT 0,
    quality_deduction_estimated NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total_deductions_estimated NUMERIC(12, 2) NOT NULL,
    net_return_estimated NUMERIC(12, 2) NOT NULL,
    net_price_per_qtl_estimated NUMERIC(10, 2) NOT NULL,
    alternative_markets_compared JSONB DEFAULT '[]'::jsonb,
    decision_rationale TEXT NOT NULL,
    buyer_name VARCHAR(150),
    status VARCHAR(30) NOT NULL DEFAULT 'Planned' CHECK (status IN ('Planned', 'Dispatched', 'Sold', 'Cancelled')),
    realized_price_per_qtl NUMERIC(10, 2),
    realized_net_return NUMERIC(12, 2),
    realized_deductions_total NUMERIC(12, 2),
    sale_completion_date DATE,
    variance_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. DECISION AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS decision_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    decision_id UUID NOT NULL REFERENCES selling_decisions(id) ON DELETE CASCADE,
    changed_by UUID REFERENCES users_profile(id) ON DELETE SET NULL,
    previous_status VARCHAR(30),
    new_status VARCHAR(30) NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. SYSTEM SETTINGS TABLE
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(50) PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_quotes_crop_grade_date ON market_quotes (crop_id, grade_id, quote_date DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_market_date ON market_quotes (market_id, quote_date DESC);
CREATE INDEX IF NOT EXISTS idx_decisions_user ON selling_decisions (user_id, decision_date DESC);
CREATE INDEX IF NOT EXISTS idx_decisions_crop ON selling_decisions (crop_id, status);
CREATE INDEX IF NOT EXISTS idx_lots_user ON grower_lots (user_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_decision ON decision_audit_logs (decision_id, created_at DESC);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE users_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE crops ENABLE ROW LEVEL SECURITY;
ALTER TABLE crop_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE grower_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE selling_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Crops
DROP POLICY IF EXISTS "Public crops read" ON crops;
CREATE POLICY "Public crops read" ON crops FOR SELECT USING (true);
DROP POLICY IF EXISTS "Staff manage crops" ON crops;
CREATE POLICY "Staff manage crops" ON crops FOR ALL USING (true);

-- Grades
DROP POLICY IF EXISTS "Public grades read" ON crop_grades;
CREATE POLICY "Public grades read" ON crop_grades FOR SELECT USING (true);
DROP POLICY IF EXISTS "Staff manage grades" ON crop_grades;
CREATE POLICY "Staff manage grades" ON crop_grades FOR ALL USING (true);

-- Markets
DROP POLICY IF EXISTS "Public markets read" ON markets;
CREATE POLICY "Public markets read" ON markets FOR SELECT USING (true);
DROP POLICY IF EXISTS "Staff manage markets" ON markets;
CREATE POLICY "Staff manage markets" ON markets FOR ALL USING (true);

-- Quotes
DROP POLICY IF EXISTS "Public quotes read" ON market_quotes;
CREATE POLICY "Public quotes read" ON market_quotes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Staff insert quotes" ON market_quotes;
CREATE POLICY "Staff insert quotes" ON market_quotes FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Staff update quotes" ON market_quotes;
CREATE POLICY "Staff update quotes" ON market_quotes FOR UPDATE USING (true);

-- Lots
DROP POLICY IF EXISTS "Users view own lots" ON grower_lots;
CREATE POLICY "Users view own lots" ON grower_lots FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users manage own lots" ON grower_lots;
CREATE POLICY "Users manage own lots" ON grower_lots FOR ALL USING (true);

-- Decisions
DROP POLICY IF EXISTS "Users view own decisions" ON selling_decisions;
CREATE POLICY "Users view own decisions" ON selling_decisions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users manage own decisions" ON selling_decisions;
CREATE POLICY "Users manage own decisions" ON selling_decisions FOR ALL USING (true);

-- Audit
DROP POLICY IF EXISTS "Users view own decision audit" ON decision_audit_logs;
CREATE POLICY "Users view own decision audit" ON decision_audit_logs FOR SELECT USING (true);
