/**
 * Net-Return Comparison Controller & Calculator
 */

const Calculator = {
  async init() {
    this.bindEvents();
  },

  bindEvents() {
    const cropSelect = document.getElementById('calc-crop-select');
    if (cropSelect) {
      cropSelect.addEventListener('change', async (e) => {
        State.comparisonInputs.cropId = e.target.value;
        await this.loadGradesForCrop(e.target.value);
        this.runComparison();
      });
    }

    const gradeSelect = document.getElementById('calc-grade-select');
    if (gradeSelect) {
      gradeSelect.addEventListener('change', (e) => {
        State.comparisonInputs.gradeId = e.target.value;
        this.runComparison();
      });
    }

    const volInput = document.getElementById('calc-volume-input');
    if (volInput) {
      volInput.addEventListener('input', (e) => {
        State.comparisonInputs.volumeQtl = Number(e.target.value) || 50;
        this.runComparison();
      });
    }

    // Deduction parameters inputs
    const paramInputs = [
      { id: 'calc-transport-rate', key: 'transportRatePerKmQtl' },
      { id: 'calc-handling-rate', key: 'handlingPerQtl' },
      { id: 'calc-commission-rate', key: 'commissionPct' },
      { id: 'calc-cess-rate', key: 'marketCessPct' },
      { id: 'calc-packaging-rate', key: 'packagingPerQtl' },
      { id: 'calc-quality-rate', key: 'qualityDeductionPerQtl' }
    ];

    paramInputs.forEach(({ id, key }) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', (e) => {
          State.comparisonInputs[key] = parseFloat(e.target.value) || 0;
          this.runComparison();
        });
      }
    });

    // Form to save decision
    const saveForm = document.getElementById('save-decision-form');
    if (saveForm) {
      saveForm.addEventListener('submit', (e) => this.handleSaveDecisionSubmit(e));
    }
  },

  async loadCropsAndRun() {
    try {
      const cropsRes = await API.getCrops();
      if (cropsRes.success && cropsRes.data) {
        State.crops = cropsRes.data;
        const cropSelect = document.getElementById('calc-crop-select');
        if (cropSelect) {
          cropSelect.innerHTML = State.crops.map(c => 
            `<option value="${c.id}" ${c.id === State.comparisonInputs.cropId ? 'selected' : ''}>${c.name} (${c.category})</option>`
          ).join('');
        }

        await this.loadGradesForCrop(State.comparisonInputs.cropId);
        await this.runComparison();
      }
    } catch (err) {
      console.error('Failed to initialize crops:', err);
      UI.showToast('Failed to load crop list.', 'error');
    }
  },

  async loadGradesForCrop(cropId) {
    try {
      const gradesRes = await API.getCropGrades(cropId);
      if (gradesRes.success && gradesRes.data) {
        State.currentGrades = gradesRes.data;
        const gradeSelect = document.getElementById('calc-grade-select');
        if (gradeSelect) {
          gradeSelect.innerHTML = State.currentGrades.map((g, idx) => 
            `<option value="${g.id}" ${idx === 0 ? 'selected' : ''}>${g.grade_name}</option>`
          ).join('');
          if (State.currentGrades.length > 0) {
            State.comparisonInputs.gradeId = State.currentGrades[0].id;
          }
        }
      }
    } catch (err) {
      console.error('Failed to load grades:', err);
    }
  },

  async runComparison() {
    const resultsContainer = document.getElementById('comparison-results-container');
    if (!resultsContainer) return;

    try {
      const res = await API.runComparison({
        crop_id: State.comparisonInputs.cropId,
        grade_id: State.comparisonInputs.gradeId,
        volume_qtl: State.comparisonInputs.volumeQtl,
        transport_rate_per_km_qtl: State.comparisonInputs.transportRatePerKmQtl,
        handling_per_qtl: State.comparisonInputs.handlingPerQtl,
        commission_pct: State.comparisonInputs.commissionPct,
        market_cess_pct: State.comparisonInputs.marketCessPct,
        packaging_per_qtl: State.comparisonInputs.packagingPerQtl,
        quality_deduction_per_qtl: State.comparisonInputs.qualityDeductionPerQtl,
        custom_distances: State.comparisonInputs.customDistances
      });

      if (!res.success || !res.data) {
        resultsContainer.innerHTML = `<div class="empty-state"><p>Failed to compute comparison.</p></div>`;
        return;
      }

      State.comparisonResults = res.data;
      this.renderComparison(res.data);
    } catch (err) {
      console.error('Comparison error:', err);
      resultsContainer.innerHTML = `<div class="empty-state"><p class="text-danger">${err.message}</p></div>`;
    }
  },

  renderComparison(data) {
    const resultsContainer = document.getElementById('comparison-results-container');
    if (!resultsContainer) return;

    const { results, winner, runnerUp, nearest, volumeQtl } = data;

    if (!results || results.length === 0) {
      resultsContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🌾</div>
          <h3>No Market Quotes Found for This Crop</h3>
          <p>Be the first to log a quote or click "Import CSV" to populate mandi data.</p>
          <button class="btn btn-primary" onclick="UI.switchView('quotes')" style="margin-top: 14px;">Go to Market Quotes</button>
        </div>
      `;
      return;
    }

    // 1. Build Winner Spotlight
    let spotlightHtml = '';
    if (winner) {
      const advantageVsNearest = Math.round(winner.advantageVsNearest);
      const isWinnerLocal = nearest && winner.marketId === nearest.marketId;

      spotlightHtml = `
        <div class="comparison-winner-spotlight">
          <div class="winner-badge-ribbon">⭐ Highest Realized Net Return (Rank #1)</div>
          <div class="winner-grid">
            <div>
              <h3 style="color: #14532D; font-size: 1.45rem;">${winner.marketName}</h3>
              <p style="color: #166534; font-size: 0.9rem; margin-top: 2px;">
                ${winner.location} • ${winner.marketType} • Distance: <strong>${winner.distanceKm} km</strong>
              </p>
              <div class="winner-advantage-tag">
                ${isWinnerLocal 
                  ? `🏆 Local market yields highest net return! Saves ₹${Math.abs(advantageVsNearest).toLocaleString()} in wasted freight.`
                  : `💰 +₹${advantageVsNearest.toLocaleString()} extra net profit vs local mandi (${nearest ? nearest.marketName : 'Local'})`
                }
              </div>
              <p style="margin-top: 12px; font-size: 0.875rem; color: #166534; font-style: italic;">
                "${winner.takeaway}"
              </p>
            </div>
            <div style="text-align: right;">
              <span style="font-size: 0.8rem; text-transform: uppercase; color: #15803D; font-weight: 700;">Net Realized Return</span>
              <div class="winner-net-price">${UI.formatINR(winner.netReturn)}</div>
              <div style="font-size: 1.1rem; font-weight: 700; color: #166534;">
                ${UI.formatINR(winner.netPricePerQtl)} <span style="font-size: 0.8rem; font-weight: 500;">/ Quintal</span>
              </div>
              <div style="font-size: 0.8rem; color: #4B5563; margin-top: 4px;">
                Headline: ${UI.formatINR(winner.headlinePrice)} • Total Deductions: -${UI.formatINR(winner.costs.totalDeductions)} (${winner.deductionPct}%)
              </div>
              <button class="btn btn-primary btn-sm" style="margin-top: 12px;" onclick="Calculator.openSaveModal('${winner.quoteId}')">
                💾 Log This Selling Decision
              </button>
            </div>
          </div>
        </div>
      `;
    }

    // 2. Build Market Cards List
    const cardsHtml = results.map(item => {
      const isWinner = item.rank === 1;
      const isNearest = nearest && item.marketId === nearest.marketId;

      return `
        <div class="market-comp-card ${isWinner ? 'is-winner' : ''}">
          <div class="market-comp-header">
            <div>
              <div class="market-comp-name">
                <span class="badge ${isWinner ? 'badge-winner' : 'badge-status'}">Rank #${item.rank}</span>
                <span>${item.marketName}</span>
                ${isNearest ? '<span class="badge badge-fresh">📍 Nearest Mandi</span>' : ''}
              </div>
              <div class="market-meta-tags">
                <span class="market-meta-tag">${item.location}</span>
                <span class="market-meta-tag">${item.marketType}</span>
                <span class="market-meta-tag">Transit: ${item.distanceKm} km</span>
                <span class="market-meta-tag">Source: ${item.source}</span>
              </div>
            </div>
            <div style="text-align: right;">
              ${item.isStale ? `
                <div class="badge badge-stale" title="${item.freshness_warning || 'Quote is over 48h old'}">
                  ⚠️ Stale Quote (${item.stalenessHours}h old)
                </div>
              ` : `
                <div class="badge badge-fresh">
                  ✓ Fresh (${item.stalenessHours}h ago)
                </div>
              `}
            </div>
          </div>

          ${item.isStale ? `
            <div class="stale-warning-banner">
              <span>⚠️ <strong>Stale Data Warning:</strong> This quote is ${item.stalenessHours} hours old. Mandi arrivals and buyer rates may have changed since. Verify with the market secretary before dispatch.</span>
            </div>
          ` : ''}

          <!-- Price & Return Matrix -->
          <div class="comp-price-matrix">
            <div>
              <div class="comp-col-label">Headline Price</div>
              <div class="comp-col-val">${UI.formatINR(item.headlinePrice)}<span style="font-size: 0.75rem;">/qtl</span></div>
              <div style="font-size: 0.75rem; color: var(--color-text-muted);">Gross: ${UI.formatINR(item.grossRevenue)}</div>
            </div>
            <div>
              <div class="comp-col-label">Total Deductions</div>
              <div class="comp-col-val deduction-val">-${UI.formatINR(item.costs.totalDeductions)}</div>
              <div style="font-size: 0.75rem; color: var(--color-danger);">${item.deductionPct}% of gross</div>
            </div>
            <div>
              <div class="comp-col-label">Net Realized Price</div>
              <div class="comp-col-val net-val">${UI.formatINR(item.netPricePerQtl)}<span style="font-size: 0.75rem;">/qtl</span></div>
              <div style="font-size: 0.75rem; color: var(--color-text-muted);">After all logistics</div>
            </div>
            <div>
              <div class="comp-col-label">Total Cash-in-Hand</div>
              <div class="comp-col-val net-val">${UI.formatINR(item.netReturn)}</div>
              <div style="font-size: 0.75rem; color: ${item.diffTotalVsBest >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}; font-weight: 600;">
                ${item.diffTotalVsBest === 0 ? '⭐ Best Net Option' : `${UI.formatINR(item.diffTotalVsBest)} vs #1`}
              </div>
            </div>
          </div>

          <!-- Deduction Breakdown Accordion/Details -->
          <details style="margin: 8px 0; font-size: 0.85rem;">
            <summary style="cursor: pointer; color: var(--color-primary); font-weight: 600;">
              🔍 View Detailed Deduction Breakdown (${item.volumeQtl} Quintals)
            </summary>
            <table class="deductions-detail-table">
              <thead>
                <tr>
                  <th>Deduction Head</th>
                  <th>Rate / Factor</th>
                  <th>Amount (INR)</th>
                  <th>Per Quintal</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Freight / Transport (${item.distanceKm} km)</td>
                  <td>₹${State.comparisonInputs.transportRatePerKmQtl}/km/qtl</td>
                  <td>${UI.formatINR(item.costs.transportCost)}</td>
                  <td>₹${item.perQuintal.transport}</td>
                </tr>
                <tr>
                  <td>Hamali (Loading & Unloading)</td>
                  <td>₹${item.perQuintal.handling}/qtl</td>
                  <td>${UI.formatINR(item.costs.handlingCost)}</td>
                  <td>₹${item.perQuintal.handling}</td>
                </tr>
                <tr>
                  <td>Mandi Commission Fee</td>
                  <td>${State.comparisonInputs.commissionPct}%</td>
                  <td>${UI.formatINR(item.costs.commissionCost)}</td>
                  <td>₹${item.perQuintal.commission}</td>
                </tr>
                <tr>
                  <td>Market Development Cess</td>
                  <td>${State.comparisonInputs.marketCessPct}%</td>
                  <td>${UI.formatINR(item.costs.cessCost)}</td>
                  <td>₹${item.perQuintal.cess}</td>
                </tr>
                <tr>
                  <td>Packaging / Gunny Bags</td>
                  <td>₹${item.perQuintal.packaging}/qtl</td>
                  <td>${UI.formatINR(item.costs.packagingCost)}</td>
                  <td>₹${item.perQuintal.packaging}</td>
                </tr>
                <tr>
                  <td>Moisture / Quality Deduction</td>
                  <td>₹${item.perQuintal.quality}/qtl</td>
                  <td>${UI.formatINR(item.costs.qualityDeductionCost)}</td>
                  <td>₹${item.perQuintal.quality}</td>
                </tr>
                <tr>
                  <td><strong>TOTAL DEDUCTIONS</strong></td>
                  <td>—</td>
                  <td><strong>${UI.formatINR(item.costs.totalDeductions)}</strong></td>
                  <td><strong>₹${item.perQuintal.totalDeduction}</strong></td>
                </tr>
              </tbody>
            </table>
          </details>

          <!-- Grower takeaway -->
          <div class="comp-takeaway-bar">
            💡 <strong>Grower Intelligence:</strong> ${item.takeaway}
          </div>

          <div class="comp-card-actions">
            <span style="font-size: 0.8rem; color: var(--color-text-muted);">
              Mandi Quote Date: <strong>${item.quoteDate}</strong>
            </span>
            <button class="btn ${isWinner ? 'btn-primary' : 'btn-outline'} btn-sm" onclick="Calculator.openSaveModal('${item.quoteId}')">
              💾 Record Decision for ${item.marketName}
            </button>
          </div>
        </div>
      `;
    }).join('');

    resultsContainer.innerHTML = `
      ${spotlightHtml}
      <div style="margin-bottom: 12px; font-weight: 700; color: var(--color-primary); font-size: 1.1rem;">
        📊 Detailed Net-Return Comparison (${results.length} Markets Quoting)
      </div>
      <div class="market-comparison-cards">
        ${cardsHtml}
      </div>
    `;
  },

  openSaveModal(quoteId) {
    if (!State.comparisonResults || !State.comparisonResults.results) return;
    const match = State.comparisonResults.results.find(r => r.quoteId === quoteId);
    if (!match) return;

    State.selectedQuoteForDecision = match;

    document.getElementById('decision-modal-crop').value = State.comparisonResults.crop?.name || 'Selected Crop';
    document.getElementById('decision-modal-market').value = match.marketName;
    document.getElementById('decision-modal-volume').value = match.volumeQtl;
    document.getElementById('decision-modal-headline').value = match.headlinePrice;
    document.getElementById('decision-modal-net-price').value = match.netPricePerQtl;
    document.getElementById('decision-modal-net-return').value = match.netReturn;
    document.getElementById('decision-modal-deductions').value = match.costs.totalDeductions;

    // Default suggested rationale
    const rationaleInput = document.getElementById('decision-modal-rationale');
    if (rationaleInput) {
      rationaleInput.value = match.takeaway;
    }

    UI.openModal('save-decision-modal');
  },

  async handleSaveDecisionSubmit(e) {
    e.preventDefault();
    if (!State.selectedQuoteForDecision) return;

    const match = State.selectedQuoteForDecision;
    const rationale = document.getElementById('decision-modal-rationale').value;
    const buyerName = document.getElementById('decision-modal-buyer').value;

    if (!rationale || !rationale.trim()) {
      UI.showToast('Please provide a decision rationale explaining your market choice.', 'warning');
      return;
    }

    const payload = {
      crop_id: State.comparisonInputs.cropId,
      grade_id: State.comparisonInputs.gradeId,
      market_id: match.marketId,
      quote_id: match.quoteId,
      decision_date: new Date().toISOString().split('T')[0],
      volume_qtl: match.volumeQtl,
      headline_quote_per_qtl: match.headlinePrice,
      transport_cost_estimated: match.costs.transportCost,
      handling_cost_estimated: match.costs.handlingCost,
      commission_cost_estimated: match.costs.commissionCost,
      cess_cost_estimated: match.costs.cessCost,
      packaging_cost_estimated: match.costs.packagingCost,
      quality_deduction_estimated: match.costs.qualityDeductionCost,
      alternative_markets_compared: State.comparisonResults.results.slice(0, 3).map(r => ({
        market_name: r.marketName,
        headline_price: r.headlinePrice,
        net_price_per_qtl: r.netPricePerQtl,
        net_return: r.netReturn
      })),
      decision_rationale: rationale.trim(),
      buyer_name: buyerName ? buyerName.trim() : null,
      status: 'Planned'
    };

    try {
      const res = await API.createDecision(payload);
      if (res.success) {
        UI.closeModal('save-decision-modal');
        UI.showToast('Selling decision logged successfully! View in Decision Log.', 'success');
        UI.switchView('decisions');
      }
    } catch (err) {
      console.error('Failed to save decision:', err);
      UI.showToast(err.message, 'error');
    }
  }
};
