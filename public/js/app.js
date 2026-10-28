/**
 * Application Bootstrap & Main Orchestrator
 */

const App = {
  async init() {
    console.log('🌾 Initializing Crop-Wise Market Intelligence App...');
    UI.setupModalBackdrops();

    await this.loadAppMetadata();
    await this.setupPersonaSwitcher();
    this.setupNavigation();
    this.initLandingSandbox();

    // Initialize modules
    await Calculator.init();
    await Decisions.init();
    await Quotes.init();
    Charts.init();

    // Load initial views
    await this.loadLandingMarketPulse();
    await this.loadAnalytics();

    console.log('✅ Crop-Wise App Ready.');
  },

  async loadAppMetadata() {
    try {
      const statusRes = await API.getDbStatus();
      if (statusRes.success) {
        const status = statusRes.data;
        const bannerText = document.getElementById('db-status-text');
        if (bannerText) {
          if (status.supabaseConnected) {
            bannerText.innerHTML = `🟢 <strong>Supabase Connected:</strong> PostgreSQL RLS Active`;
          } else {
            bannerText.innerHTML = `🟡 <strong>Operational Mode:</strong> Local Seed Engine (Ready for Supabase link)`;
          }
        }
      }

      // Load master crops & markets
      const [cropsRes, marketsRes] = await Promise.all([
        API.getCrops(),
        API.getMarkets()
      ]);

      if (cropsRes.success) State.crops = cropsRes.data;
      if (marketsRes.success) State.markets = marketsRes.data;

      // Populate filter dropdowns across pages
      this.populateMasterDropdowns();
    } catch (err) {
      console.error('Failed to load initial metadata:', err);
    }
  },

  populateMasterDropdowns() {
    // Populate Quotes Filters
    const quotesCropFilter = document.getElementById('quotes-crop-filter');
    if (quotesCropFilter && State.crops.length > 0) {
      quotesCropFilter.innerHTML = '<option value="">All Crops</option>' + 
        State.crops.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }

    const quotesMarketFilter = document.getElementById('quotes-market-filter');
    if (quotesMarketFilter && State.markets.length > 0) {
      quotesMarketFilter.innerHTML = '<option value="">All Mandis</option>' + 
        State.markets.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
    }

    // Populate Chart Crop Dropdown
    const chartCropSelect = document.getElementById('chart-crop-select');
    if (chartCropSelect && State.crops.length > 0) {
      chartCropSelect.innerHTML = State.crops.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }
  },

  async setupPersonaSwitcher() {
    const select = document.getElementById('global-persona-select');
    if (!select) return;

    try {
      const res = await API.getPersonas();
      if (res.success && res.data) {
        State.personas = res.data;
        select.innerHTML = State.personas.map(p => {
          let roleIcon = '👨‍🌾';
          if (p.role === 'operator') roleIcon = '🏛️';
          if (p.role === 'admin') roleIcon = '🛡️';
          if (p.role === 'visitor') roleIcon = '👤';

          return `<option value="${p.id}" ${p.id === API.activeUserId ? 'selected' : ''}>
            ${roleIcon} ${p.full_name} (${p.role})
          </option>`;
        }).join('');

        select.addEventListener('change', async (e) => {
          const chosenId = e.target.value;
          const switchRes = await API.switchPersona(chosenId);
          if (switchRes.success) {
            State.currentUser = switchRes.data;
            UI.showToast(`Switched persona to ${switchRes.data.full_name} (${switchRes.data.role})`, 'info');
            this.handleRoleVisibility();
            // Reload active view
            UI.switchView(State.activeView);
          }
        });

        // Set initial user
        const current = State.personas.find(p => p.id === API.activeUserId);
        if (current) {
          State.currentUser = current;
          this.handleRoleVisibility();
        }
      }
    } catch (err) {
      console.error('Error setting up persona switcher:', err);
    }
  },

  handleRoleVisibility() {
    const role = State.currentUser ? State.currentUser.role : 'visitor';
    // Show or hide admin/operator specific buttons
    const staffElements = document.querySelectorAll('.staff-only');
    staffElements.forEach(el => {
      el.style.display = ['operator', 'admin'].includes(role) ? '' : 'none';
    });
  },

  setupNavigation() {
    document.querySelectorAll('[data-nav-target]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const target = el.getAttribute('data-nav-target');
        UI.switchView(target);
      });
    });
  },

  async loadLandingMarketPulse() {
    const container = document.getElementById('landing-pulse-container');
    if (!container) return;

    try {
      const res = await API.getQuotes();
      if (!res.success || !res.data) return;

      const quotes = res.data.slice(0, 6);
      container.innerHTML = quotes.map(q => `
        <div class="ticker-item">
          <div class="ticker-crop">
            <span>${q.crop?.name}</span>
            <span class="badge ${q.is_stale ? 'badge-stale' : 'badge-fresh'}">${q.is_stale ? '⚠️ Stale' : '✓ Fresh'}</span>
          </div>
          <div class="ticker-price">${UI.formatINR(q.modal_price)}<span style="font-size: 0.75rem; color: var(--color-text-muted);">/qtl</span></div>
          <div class="ticker-mandi">${q.market?.name} • ${q.market?.district}</div>
        </div>
      `).join('');
    } catch (err) {
      console.error(err);
    }
  },

  initLandingSandbox() {
    const testBtn = document.getElementById('landing-test-calc-btn');
    if (!testBtn) return;

    testBtn.addEventListener('click', async () => {
      const volume = Number(document.getElementById('sandbox-vol').value) || 50;
      const dist = Number(document.getElementById('sandbox-dist').value) || 120;
      const headline = Number(document.getElementById('sandbox-price').value) || 2950;

      try {
        const res = await API.quickCalculate({
          headlinePrice: headline,
          volumeQtl: volume,
          distanceKm: dist,
          transportRatePerKmQtl: 0.85,
          handlingPerQtl: 18,
          commissionPct: 2.0,
          marketCessPct: 1.0,
          packagingPerQtl: 20
        });

        if (res.success && res.data) {
          const calc = res.data;
          document.getElementById('sandbox-gross-res').textContent = UI.formatINR(calc.grossRevenue);
          document.getElementById('sandbox-deductions-res').textContent = '-' + UI.formatINR(calc.costs.totalDeductions);
          document.getElementById('sandbox-net-res').textContent = UI.formatINR(calc.netReturn);
          document.getElementById('sandbox-net-qtl-res').textContent = UI.formatINR(calc.netPricePerQtl) + '/qtl';
        }
      } catch (err) {
        console.error(err);
      }
    });

    // Run first calculation
    testBtn.click();
  },

  async loadAnalytics() {
    try {
      const res = await API.getDashboardMetrics();
      if (!res.success || !res.data) return;

      const m = res.data;
      document.getElementById('metric-total-decisions').textContent = m.totalDecisionsCount;
      document.getElementById('metric-volume-sold').textContent = UI.formatQtl(m.totalVolumeSoldQtl);
      document.getElementById('metric-net-revenue').textContent = UI.formatINR(m.totalNetRealizedRevenue);
      document.getElementById('metric-stale-quotes').textContent = m.staleQuotesCount;
      document.getElementById('metric-deductions-paid').textContent = UI.formatINR(m.totalDeductionsPaid);

      // Recommendations list
      const recContainer = document.getElementById('analytics-recommendations-list');
      if (recContainer && m.summaryRecommendations) {
        recContainer.innerHTML = m.summaryRecommendations.map(r => `
          <div style="background: var(--bg-surface); border: 1px solid var(--border-subtle); padding: 14px 18px; border-radius: var(--radius-md); margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong style="color: var(--color-primary); font-size: 1.05rem;">${r.crop}</strong>
              <div style="font-size: 0.85rem; color: var(--color-text-secondary); margin-top: 2px;">
                Top Market: <strong>${r.bestNetMarket}</strong> • Net Price: <strong style="color: var(--color-success);">${r.netPrice}</strong>
              </div>
            </div>
            <div style="text-align: right; font-size: 0.85rem; color: var(--color-accent); font-weight: 600;">
              💡 ${r.headlineGap}
            </div>
          </div>
        `).join('');
      }
    } catch (err) {
      console.error('Failed to load metrics:', err);
    }
  }
};

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
