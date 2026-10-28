-- ==============================================================================
-- Crop-Wise Market Price Comparison and Selling Decision Log
-- Seed Data: db/seed.sql
-- ==============================================================================

-- 1. SEED SYSTEM SETTINGS
INSERT INTO system_settings (key, value, description) VALUES
('stale_quote_threshold_hours', '48', 'Threshold in hours after which a mandi quote triggers a stale-data warning'),
('app_currency_symbol', '₹', 'Currency symbol used across net-return calculations'),
('default_weight_unit', 'Quintal', 'Base unit: 1 Quintal = 100 kg'),
('freight_base_fuel_index', '1.05', 'Fuel index factor applied to default distance freight')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 2. SEED USERS PROFILE
INSERT INTO users_profile (id, email, full_name, role, phone, village_location, default_transport_rate_per_km_qtl) VALUES
('00000000-0000-0000-0000-000000000001', 'farmer.ramesh@agri.in', 'Ramesh Patel (Progressive Grower)', 'farmer', '+91 98260 12345', 'Sehore Hub, Madhya Pradesh', 0.85),
('00000000-0000-0000-0000-000000000002', 'operator.balwinder@apmc.gov.in', 'Balwinder Singh (Mandi Market Secretary)', 'operator', '+91 98140 67890', 'Khanna APMC, Punjab', 0.90),
('00000000-0000-0000-0000-000000000003', 'admin.vikram@kisanintel.org', 'Vikram Verma (Agricultural Intelligence Admin)', 'admin', '+91 98711 54321', 'New Delhi HQ', 0.80),
('00000000-0000-0000-0000-000000000004', 'visitor.demo@kisanintel.org', 'Guest Farmer / Visitor', 'visitor', '+91 90000 00000', 'Trial Village', 0.85)
ON CONFLICT (id) DO NOTHING;

-- 3. SEED CROPS
INSERT INTO crops (id, code, name, category, standard_unit, shelf_life_days, moisture_standard_percent) VALUES
('11111111-0000-0000-0000-000000000001', 'WHEAT_SHARBATI', 'Sharbati Wheat (Golden Grain)', 'Cereals', 'Quintal', 360, 12.0),
('11111111-0000-0000-0000-000000000002', 'PADDY_BASMATI_1121', 'Paddy Basmati 1121', 'Cereals', 'Quintal', 240, 14.0),
('11111111-0000-0000-0000-000000000003', 'SOYBEAN_YELLOW', 'Yellow Soybean', 'Oilseeds', 'Quintal', 180, 10.0),
('11111111-0000-0000-0000-000000000004', 'ONION_RED', 'Nashik Red Onion', 'Vegetables', 'Quintal', 45, 13.0),
('11111111-0000-0000-0000-000000000005', 'COTTON_MEDIUM', 'Medium Staple Raw Cotton (Kapas)', 'Fiber', 'Quintal', 180, 8.5),
('11111111-0000-0000-0000-000000000006', 'MUSTARD_BOLD', 'Mustard Seed (Sarson Bold)', 'Oilseeds', 'Quintal', 270, 8.0),
('11111111-0000-0000-0000-000000000007', 'POTATO_CHIPSONA', 'Potato (Chipsona processing)', 'Vegetables', 'Quintal', 90, 15.0),
('11111111-0000-0000-0000-000000000008', 'TOMATO_HYBRID', 'Hybrid Table Tomato', 'Vegetables', 'Quintal', 14, 18.0)
ON CONFLICT (id) DO NOTHING;

-- 4. SEED CROP GRADES
INSERT INTO crop_grades (id, crop_id, grade_name, specifications, price_multiplier) VALUES
-- Sharbati Wheat
('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Grade A / Premium Lustre', 'Lustrous, bold grains, moisture <11%, foreign matter <0.5%', 1.08),
('22222222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'FAQ (Fair Average Quality)', 'Standard commercial wheat, moisture <12%, refraction <1.5%', 1.00),
('22222222-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', 'Grade B / Mill Quality', 'Minor discolored grains, moisture up to 13.5%', 0.92),

-- Basmati 1121
('22222222-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000002', 'Grade A / Export Length (>8.2mm)', 'Extra-long grain, moisture 12-13%, zero chalky grain', 1.10),
('22222222-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000002', 'FAQ Standard Basmati', 'Standard grain length, moisture 13.5%', 1.00),

-- Soybean
('22222222-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000003', 'Grade A / Clean Yellow (>18% Oil)', 'Clean yellow seeds, high oil test, moisture <9%', 1.05),
('22222222-0000-0000-0000-000000000007', '11111111-0000-0000-0000-000000000003', 'FAQ Commercial Soybean', 'Standard oil mill grade, moisture 10%', 1.00),

-- Onion
('22222222-0000-0000-0000-000000000008', '11111111-0000-0000-0000-000000000004', 'Grade A / Big Export (55mm+)', 'Firm skin, large bulb uniform 55mm+, dry cured', 1.12),
('22222222-0000-0000-0000-000000000009', '11111111-0000-0000-0000-000000000004', 'FAQ Medium (40-50mm)', 'Market standard domestic kitchen grade', 1.00),

-- Mustard
('22222222-0000-0000-0000-000000000010', '11111111-0000-0000-0000-000000000006', 'Grade A / High Oil Content (>42%)', 'High pungency bold mustard, low moisture', 1.06),
('22222222-0000-0000-0000-000000000011', '11111111-0000-0000-0000-000000000006', 'FAQ Standard Mustard', 'Standard crushing seed, moisture 8.5%', 1.00)
ON CONFLICT (id) DO NOTHING;

-- 5. SEED MARKETS / MANDIS
INSERT INTO markets (id, code, name, type, district, state, distance_km_default, standard_commission_pct, standard_handling_per_qtl, market_cess_pct) VALUES
('33333333-0000-0000-0000-000000000001', 'LOCAL_MANDI', 'Sehore Local APMC Yard', 'APMC Mandi', 'Sehore', 'Madhya Pradesh', 18.0, 1.50, 14.0, 0.50),
('33333333-0000-0000-0000-000000000002', 'INDORE_APMC', 'Indore Choithram Central Mandi', 'APMC Mandi', 'Indore', 'Madhya Pradesh', 85.0, 2.00, 18.0, 1.00),
('33333333-0000-0000-0000-000000000003', 'AZADPUR_DEL', 'Azadpur National Terminal Market', 'APMC Mandi', 'North Delhi', 'Delhi', 780.0, 3.00, 26.0, 1.50),
('33333333-0000-0000-0000-000000000004', 'LASALGAON_MH', 'Lasalgaon Asia Onion Hub', 'APMC Mandi', 'Nashik', 'Maharashtra', 490.0, 2.50, 20.0, 1.00),
('33333333-0000-0000-0000-000000000005', 'KHANNA_PB', 'Khanna Asia Largest Grain Market', 'APMC Mandi', 'Ludhiana', 'Punjab', 890.0, 2.00, 22.0, 2.00),
('33333333-0000-0000-0000-000000000006', 'AGRO_DIRECT_COOP', 'Narmada Valley Farmers Cooperative FPO', 'Farmer Producer Org (FPO)', 'Hoshangabad', 'Madhya Pradesh', 65.0, 0.50, 12.0, 0.00),
('33333333-0000-0000-0000-000000000007', 'ITC_ECHOUPAL', 'ITC Choupal Sagar Direct Hub', 'Direct Processor/Mill', 'Dewas', 'Madhya Pradesh', 52.0, 0.00, 10.0, 0.00)
ON CONFLICT (id) DO NOTHING;

-- 6. SEED DATED MARKET QUOTES
INSERT INTO market_quotes (id, crop_id, grade_id, market_id, quote_date, min_price, modal_price, max_price, arrival_volume_qtl, source, is_verified, notes) VALUES
-- Sharbati Wheat - Grade A
('44444444-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', CURRENT_DATE, 2750.00, 2840.00, 2920.00, 1420.0, 'APMC Daily Gate Register', true, 'Steady local buyer interest; payment within 24h'),
('44444444-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000002', CURRENT_DATE, 2880.00, 2980.00, 3100.00, 4800.0, 'Indore Daily Bulletin', true, 'Strong flour mill demand for high-protein grain'),
('44444444-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000003', CURRENT_DATE, 3180.00, 3290.00, 3450.00, 12500.0, 'Azadpur Terminal Desk', true, 'High headline price, but inspect freight and Delhi entry cess'),
('44444444-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000006', CURRENT_DATE, 2820.00, 2900.00, 2950.00, 850.0, 'Cooperative Procurement Bulletin', true, 'Zero commission, free bagging return, quick EFT settlement'),
('44444444-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000007', CURRENT_DATE, 2890.00, 2940.00, 2990.00, 3100.0, 'ITC Direct Purchase Counter', true, 'Transparent electronic assaying, direct bank transfer'),

-- Deliberately STALE quotes (5 days old)
('44444444-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000005', (CURRENT_DATE - INTERVAL '5 days')::DATE, 2950.00, 3050.00, 3180.00, 6200.0, 'Old Dispatcher Log', false, 'Warning: Quote is over 120 hours old, verify current mandi arrival'),

-- Yellow Soybean - Grade A
('44444444-0000-0000-0000-000000000007', '11111111-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000006', '33333333-0000-0000-0000-000000000001', CURRENT_DATE, 4550.00, 4680.00, 4790.00, 2200.0, 'Local Mandi Auction', true, 'Active local crushing mill buying'),
('44444444-0000-0000-0000-000000000008', '11111111-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000006', '33333333-0000-0000-0000-000000000002', CURRENT_DATE, 4720.00, 4860.00, 4980.00, 9400.0, 'Indore Edible Oil Exchange', true, 'Solvent extractors paying top tier for low moisture lots'),
('44444444-0000-0000-0000-000000000009', '11111111-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000006', '33333333-0000-0000-0000-000000000007', CURRENT_DATE, 4680.00, 4780.00, 4840.00, 1800.0, 'Corporate Agri Direct', true, 'Immediate payment, automated weighing'),

-- Nashik Red Onion - Grade A
('44444444-0000-0000-0000-000000000010', '11111111-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000008', '33333333-0000-0000-0000-000000000001', CURRENT_DATE, 2100.00, 2250.00, 2380.00, 850.0, 'Local Sehore Vegetable Yard', true, 'High moisture caution, immediate retail movement'),
('44444444-0000-0000-0000-000000000011', '11111111-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000008', '33333333-0000-0000-0000-000000000004', CURRENT_DATE, 2450.00, 2680.00, 2850.00, 34000.0, 'Lasalgaon Mandi Board', true, 'Heavy export buying for Dubai & Colombo consignments'),
('44444444-0000-0000-0000-000000000012', '11111111-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000008', '33333333-0000-0000-0000-000000000003', (CURRENT_DATE - INTERVAL '3 days')::DATE, 2700.00, 2920.00, 3100.00, 18000.0, 'Azadpur Vegetable Yard', false, 'Caution: Stale quote (72h ago), rains reported in transit corridor')
ON CONFLICT (id) DO NOTHING;

-- 7. SEED GROWER LOTS
INSERT INTO grower_lots (id, user_id, lot_number, crop_id, grade_id, quantity_qtl, harvest_date, storage_location, bag_count, estimated_cost_of_cultivation, status) VALUES
('55555555-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'LOT-WHT-2026-001', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 65.0, (CURRENT_DATE - INTERVAL '12 days')::DATE, 'Farm Warehouse Bay-2', 130, 95000.0, 'Evaluating Markets'),
('55555555-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'LOT-SOY-2026-004', '11111111-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000006', 42.0, (CURRENT_DATE - INTERVAL '20 days')::DATE, 'Sehore Cooperative Silo', 84, 82000.0, 'Committed'),
('55555555-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'LOT-ONI-2026-007', '11111111-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000008', 90.0, (CURRENT_DATE - INTERVAL '5 days')::DATE, 'Ventilated Onion Chawl', 180, 110000.0, 'In Storage')
ON CONFLICT (id) DO NOTHING;

-- 8. SEED SAVED SELLING DECISIONS
INSERT INTO selling_decisions (
    id, user_id, lot_id, crop_id, grade_id, market_id, quote_id,
    decision_date, volume_qtl, headline_quote_per_qtl, gross_revenue_estimated,
    transport_cost_estimated, handling_cost_estimated, commission_cost_estimated,
    cess_cost_estimated, packaging_cost_estimated, quality_deduction_estimated,
    total_deductions_estimated, net_return_estimated, net_price_per_qtl_estimated,
    alternative_markets_compared, decision_rationale, buyer_name, status,
    realized_price_per_qtl, realized_net_return, realized_deductions_total,
    sale_completion_date, variance_notes
) VALUES
(
    '66666666-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '55555555-0000-0000-0000-000000000001',
    '11111111-0000-0000-0000-000000000001',
    '22222222-0000-0000-0000-000000000001',
    '33333333-0000-0000-0000-000000000002',
    '44444444-0000-0000-0000-000000000002',
    (CURRENT_DATE - INTERVAL '2 days')::DATE,
    65.0,
    2980.00,
    193700.00,
    4696.25,
    1170.00,
    3874.00,
    1937.00,
    1300.00,
    650.00,
    13627.25,
    180072.75,
    2770.35,
    '[{"market_name": "Sehore Local APMC", "headline_price": 2840, "net_price_per_qtl": 2758.50, "net_return": 179302.50}, {"market_name": "Azadpur Terminal", "headline_price": 3290, "net_price_per_qtl": 2728.10, "net_return": 177326.50}]'::jsonb,
    'Chosen Indore over Azadpur because Azadpur freight of 780km (₹43,000+) completely wipes out the headline premium. Indore yields higher net return (₹2,770/qtl) than both Local (₹2,758) and Azadpur (₹2,728) with reasonable 1.5 hr transit risk.',
    'Mahalakshmi Agro Traders (Shop #42)',
    'Sold',
    2995.00,
    181210.00,
    13465.00,
    (CURRENT_DATE - INTERVAL '1 day')::DATE,
    'Auction cleared at ₹2,995/qtl (+₹15 above quote). Moisture was tested at 11.2% so buyer reduced refraction cut by ₹300. Net advantage vs local mandi verified at +₹1,908 total profit.'
),
(
    '66666666-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    '55555555-0000-0000-0000-000000000002',
    '11111111-0000-0000-0000-000000000003',
    '22222222-0000-0000-0000-000000000006',
    '33333333-0000-0000-0000-000000000007',
    '44444444-0000-0000-0000-000000000009',
    CURRENT_DATE,
    42.0,
    4780.00,
    200760.00,
    1856.40,
    420.00,
    0.00,
    0.00,
    840.00,
    0.00,
    3116.40,
    197643.60,
    4705.80,
    '[{"market_name": "Indore APMC", "headline_price": 4860, "net_price_per_qtl": 4668.20, "net_return": 196064.40}, {"market_name": "Local Mandi", "headline_price": 4680, "net_price_per_qtl": 4568.10, "net_return": 191860.20}]'::jsonb,
    'Even though Indore has headline quote ₹4,860, after APMC 2% commission + 1% cess + higher freight, Indore net is ₹4,668/qtl. ITC direct hub gives ₹4,705.80/qtl net (+₹37.60/qtl higher cash in hand) with zero broker disputes.',
    'ITC Agri Business Procurement Center Dewas',
    'Planned',
    NULL,
    NULL,
    NULL,
    NULL,
    'Scheduled truck dispatch for tomorrow 08:00 AM'
)
ON CONFLICT (id) DO NOTHING;

-- 9. SEED AUDIT LOGS
INSERT INTO decision_audit_logs (decision_id, changed_by, previous_status, new_status, action_type, details) VALUES
('66666666-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Planned', 'Dispatched', 'STATUS_CHANGE', '{"reason": "Vehicle MP-04-GA-1122 loaded with 65 quintals"}'::jsonb),
('66666666-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Dispatched', 'Sold', 'SALE_RECONCILED', '{"realized_price": 2995.00, "net_realized": 181210.00, "payment_mode": "NEFT"}'::jsonb),
('66666666-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', NULL, 'Planned', 'DECISION_CREATED', '{"planned_volume": 42.0, "market": "ITC Choupal Sagar Dewas"}'::jsonb);
