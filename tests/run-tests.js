/**
 * Automated Verification & QA Test Suite
 * Crop-Wise Market Price Comparison and Selling Decision Log
 */

const http = require('http');
const app = require('../server');
const { calculateNetReturn, compareMarkets } = require('../src/services/netReturnEngine');
const { evaluateQuoteFreshness } = require('../src/services/stalenessEngine');

let server;
let baseUrl;

function runSuite() {
  return new Promise((resolve) => {
    server = app.listen(0, async () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      console.log(`\n======================================================`);
      console.log(`🧪 STARTING AUTOMATED TEST SUITE ON PORT ${port}`);
      console.log(`======================================================\n`);

      let passed = 0;
      let failed = 0;

      function assert(condition, testName) {
        if (condition) {
          console.log(`  ✅ PASS: ${testName}`);
          passed++;
        } else {
          console.error(`  ❌ FAIL: ${testName}`);
          failed++;
        }
      }

      async function testRequest(path, options = {}) {
        const url = `${baseUrl}${path}`;
        const method = options.method || 'GET';
        const headers = {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        };

        const res = await fetch(url, {
          method,
          headers,
          body: options.body ? JSON.stringify(options.body) : undefined
        });

        const contentType = res.headers.get('content-type') || '';
        let data;
        if (contentType.includes('application/json')) {
          data = await res.json();
        } else {
          data = await res.text();
        }

        return { status: res.status, headers: res.headers, data };
      }

      try {
        // -------------------------------------------------------------------
        // 1. DOMAIN & BUSINESS ENGINE UNIT TESTS
        // -------------------------------------------------------------------
        console.log('--- 1. Business Logic & Calculation Engine Tests ---');

        // Test 1.1: Net Return Formula
        const calc1 = calculateNetReturn({
          headlinePrice: 2980,
          volumeQtl: 65,
          distanceKm: 85,
          transportRatePerKmQtl: 0.85,
          handlingPerQtl: 18,
          commissionPct: 2.0,
          marketCessPct: 1.0,
          packagingPerQtl: 20,
          qualityDeductionPerQtl: 10
        });

        assert(calc1.grossRevenue === 193700, 'Gross revenue is headlinePrice * volume');
        assert(calc1.costs.transportCost === 4696.25, 'Freight calculation dist * rate * volume is exact');
        assert(calc1.costs.commissionCost === 3874, 'Mandi commission is 2% of gross');
        assert(calc1.costs.totalDeductions === 13627.25, 'Total deductions sum up correctly');
        assert(calc1.netReturn === 180072.75, 'Net return equals gross minus deductions');
        assert(calc1.netPricePerQtl === 2770.35, 'Net price per quintal matches');

        // Test 1.2: Headline Price Trap Verification
        // Distant market with higher headline price yields lower net return than regional
        const azadpurCalc = calculateNetReturn({
          headlinePrice: 3290, // +₹310 higher raw price
          volumeQtl: 65,
          distanceKm: 780,    // High freight!
          transportRatePerKmQtl: 0.85,
          handlingPerQtl: 26,
          commissionPct: 3.0,
          marketCessPct: 1.5,
          packagingPerQtl: 20,
          qualityDeductionPerQtl: 0
        });

        assert(azadpurCalc.headlinePrice > calc1.headlinePrice, 'Azadpur headline quote is higher');
        assert(calc1.netReturn > azadpurCalc.netReturn, 'Indore net cash-in-hand is HIGHER than Azadpur despite lower headline');
        const profitDifference = calc1.netReturn - azadpurCalc.netReturn;
        console.log(`    ℹ️ Proved Headline Trap: Indore yields +₹${profitDifference.toFixed(2)} extra profit over Azadpur.`);

        // Test 1.3: Staleness Detection
        const freshCheck = evaluateQuoteFreshness(new Date().toISOString(), 48);
        assert(freshCheck.isStale === false && freshCheck.level === 'FRESH', 'Quote from today is FRESH');

        const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
        const staleCheck = evaluateQuoteFreshness(fiveDaysAgo, 48);
        assert(staleCheck.isStale === true && staleCheck.level === 'VERY_STALE', '5-day old quote triggers VERY_STALE warning');

        // -------------------------------------------------------------------
        // 2. REST API & CRUD WORKFLOW TESTS
        // -------------------------------------------------------------------
        console.log('\n--- 2. REST API & Integration Tests ---');

        // Test 2.1: Health & Database Status
        const healthRes = await testRequest('/api/health');
        assert(healthRes.status === 200 && healthRes.data.status === 'healthy', 'GET /api/health responds with healthy');

        const statusRes = await testRequest('/api/auth/status');
        assert(statusRes.status === 200 && statusRes.data.success === true, 'GET /api/auth/status returns DB metadata');

        // Test 2.2: Crops & Grades Endpoints
        const cropsRes = await testRequest('/api/crops');
        assert(cropsRes.status === 200 && Array.isArray(cropsRes.data.data) && cropsRes.data.data.length >= 8, 'GET /api/crops returns seeded agricultural crops');

        const gradesRes = await testRequest(`/api/crops/grades?cropId=11111111-0000-0000-0000-000000000001`);
        assert(gradesRes.status === 200 && gradesRes.data.data.length >= 3, 'GET /api/crops/grades returns grades for Sharbati Wheat');

        // Test 2.3: Markets Endpoint
        const marketsRes = await testRequest('/api/markets');
        assert(marketsRes.status === 200 && marketsRes.data.data.length >= 7, 'GET /api/markets returns mandis & terminal markets');

        // Test 2.4: Quotes & Filtering
        const quotesRes = await testRequest('/api/quotes');
        assert(quotesRes.status === 200 && quotesRes.data.count >= 10, 'GET /api/quotes returns dated market quotes');

        const staleQuotesRes = await testRequest('/api/quotes?stale_only=true');
        assert(staleQuotesRes.status === 200 && staleQuotesRes.data.data.every(q => q.is_stale === true), 'Filter stale_only=true returns only stale quotes');

        // Test 2.5: Quote Validation & Submission
        const invalidQuoteRes = await testRequest('/api/quotes', {
          method: 'POST',
          body: { crop_id: '11111111-0000-0000-0000-000000000001', modal_price: -50 } // Invalid negative price
        });
        assert(invalidQuoteRes.status === 400 && invalidQuoteRes.data.error.code === 'VALIDATION_ERROR', 'Validation rejects negative modal price');

        const validQuoteRes = await testRequest('/api/quotes', {
          method: 'POST',
          headers: { 'x-user-id': '00000000-0000-0000-0000-000000000002' }, // Balwinder Operator
          body: {
            crop_id: '11111111-0000-0000-0000-000000000001',
            grade_id: '22222222-0000-0000-0000-000000000001',
            market_id: '33333333-0000-0000-0000-000000000001',
            modal_price: 2860,
            min_price: 2800,
            max_price: 2920,
            arrival_volume_qtl: 1500,
            source: 'Test APMC Evening Bell',
            notes: 'Test suite automated quote'
          }
        });
        assert(validQuoteRes.status === 201 && validQuoteRes.data.success === true, 'POST /api/quotes creates new verified quote');

        // Test 2.6: Net-Return Comparison Endpoint
        const compRes = await testRequest('/api/comparison/compare', {
          method: 'POST',
          body: {
            crop_id: '11111111-0000-0000-0000-000000000001',
            grade_id: '22222222-0000-0000-0000-000000000001',
            volume_qtl: 70,
            transport_rate_per_km_qtl: 0.85
          }
        });
        assert(compRes.status === 200 && compRes.data.data.results.length > 0, 'POST /api/comparison/compare returns ranked markets');
        assert(compRes.data.data.winner != null, 'Comparison identifies a clear Winner market');

        // Test 2.7: Selling Decisions CRUD & State Transitions
        const newDecisionRes = await testRequest('/api/decisions', {
          method: 'POST',
          headers: { 'x-user-id': '00000000-0000-0000-0000-000000000001' }, // Farmer Ramesh
          body: {
            crop_id: '11111111-0000-0000-0000-000000000001',
            grade_id: '22222222-0000-0000-0000-000000000001',
            market_id: '33333333-0000-0000-0000-000000000002',
            volume_qtl: 50,
            headline_quote_per_qtl: 2980,
            transport_cost_estimated: 3612.50,
            handling_cost_estimated: 900,
            commission_cost_estimated: 2980,
            cess_cost_estimated: 1490,
            packaging_cost_estimated: 1000,
            quality_deduction_estimated: 0,
            decision_rationale: 'Indore terminal provides higher net profit after deducting transit freight and handling.',
            buyer_name: 'Shree Krishna Agro Trading',
            status: 'Planned'
          }
        });
        assert(newDecisionRes.status === 201 && newDecisionRes.data.success === true, 'POST /api/decisions creates selling decision record');
        const createdDecisionId = newDecisionRes.data.data.id;

        // Test 2.8: Status transition (Planned -> Dispatched)
        const dispatchRes = await testRequest(`/api/decisions/${createdDecisionId}`, {
          method: 'PATCH',
          headers: { 'x-user-id': '00000000-0000-0000-0000-000000000001' },
          body: { status: 'Dispatched' }
        });
        assert(dispatchRes.status === 200 && dispatchRes.data.data.status === 'Dispatched', 'PATCH status to Dispatched succeeds');

        // Test 2.9: Reconcile Sale (Dispatched -> Sold with Realized Price)
        const reconcileRes = await testRequest(`/api/decisions/${createdDecisionId}`, {
          method: 'PATCH',
          headers: { 'x-user-id': '00000000-0000-0000-0000-000000000001' },
          body: {
            status: 'Sold',
            realized_price_per_qtl: 3010,
            realized_deductions_total: 9800,
            variance_notes: 'Sold at +₹30 premium over quote due to superior luster. Realized higher net return.'
          }
        });
        assert(reconcileRes.status === 200 && reconcileRes.data.data.status === 'Sold', 'Sale reconciliation completes and calculates realized net return');
        assert(reconcileRes.data.data.realized_net_return > 0, 'Realized net return is calculated and stored');

        // Test 2.10: Audit Log Verification
        const auditRes = await testRequest(`/api/decisions/${createdDecisionId}`, {
          headers: { 'x-user-id': '00000000-0000-0000-0000-000000000001' }
        });
        assert(auditRes.data.data.audits && auditRes.data.data.audits.length >= 3, 'Audit trail logs initial creation and both status transitions');

        // Test 2.11: Role boundary test (Visitor attempting to create decision)
        const visitorDecisionRes = await testRequest('/api/decisions', {
          method: 'POST',
          headers: { 'x-user-id': '00000000-0000-0000-0000-000000000004' }, // Visitor
          body: {
            crop_id: '11111111-0000-0000-0000-000000000001',
            grade_id: '22222222-0000-0000-0000-000000000001',
            market_id: '33333333-0000-0000-0000-000000000002',
            volume_qtl: 50,
            headline_quote_per_qtl: 2980,
            decision_rationale: 'Visitor test'
          }
        });
        assert(visitorDecisionRes.status === 403, 'Role boundary enforced: Visitor forbidden from creating persistent decisions');

        // Test 2.12: CSV Export Endpoints
        const exportQuotesRes = await testRequest('/api/csv/export-quotes');
        assert(exportQuotesRes.status === 200 && exportQuotesRes.data.includes('Quote ID,Quote Date'), 'GET /api/csv/export-quotes returns CSV format');

        const exportDecisionsRes = await testRequest('/api/csv/export-decisions', {
          headers: { 'x-user-id': '00000000-0000-0000-0000-000000000001' }
        });
        assert(exportDecisionsRes.status === 200 && exportDecisionsRes.data.includes('Decision ID,Decision Date'), 'GET /api/csv/export-decisions returns CSV format');

        // Test 2.13: CSV Import Endpoint
        const csvSample = `Crop, Market, Modal Price, Min Price, Max Price, Volume, Source
Sharbati Wheat, Indore Choithram Central Mandi, 2990, 2920, 3050, 4200, CSV Integration Test
Yellow Soybean, Sehore Local APMC Yard, 4720, 4650, 4800, 1900, CSV Integration Test`;

        const importRes = await testRequest('/api/csv/import-quotes', {
          method: 'POST',
          headers: { 'x-user-id': '00000000-0000-0000-0000-000000000002' }, // Operator
          body: { csv_text: csvSample }
        });
        assert(importRes.status === 200 && importRes.data.summary.successCount === 2, 'POST /api/csv/import-quotes parses and inserts valid CSV rows');

        // Test 2.14: Analytics Dashboard & Price History
        const analyticsRes = await testRequest('/api/analytics/dashboard', {
          headers: { 'x-user-id': '00000000-0000-0000-0000-000000000001' }
        });
        assert(analyticsRes.status === 200 && analyticsRes.data.data.totalDecisionsCount > 0, 'GET /api/analytics/dashboard returns metrics');

        const historyRes = await testRequest('/api/analytics/price-history?crop_id=11111111-0000-0000-0000-000000000001&days=14');
        assert(historyRes.status === 200 && historyRes.data.data.series.length > 0, 'GET /api/analytics/price-history returns 14-day time series');

        // Cleanup created decision
        await testRequest(`/api/decisions/${createdDecisionId}`, {
          method: 'DELETE',
          headers: { 'x-user-id': '00000000-0000-0000-0000-000000000001' }
        });

        await new Promise(r => setTimeout(r, 300));
      } catch (err) {
        console.error('Test execution error:', err);
        failed++;
      } finally {
        const { getDb } = require('../src/models/db');
        const pool = getDb().getPool();
        if (pool) {
          await pool.end().catch(() => {});
        }
        server.close();
        console.log(`\n======================================================`);
        console.log(`🏁 TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
        console.log(`======================================================\n`);
        resolve(failed === 0);
      }
    });
  });
}

runSuite().then(success => {
  process.exit(success ? 0 : 1);
});
