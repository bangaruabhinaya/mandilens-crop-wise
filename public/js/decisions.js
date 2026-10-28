/**
 * Selling Decision Log Controller
 */

const Decisions = {
  async init() {
    this.bindEvents();
  },

  bindEvents() {
    const statusFilter = document.getElementById('decision-status-filter');
    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => {
        State.decisionFilters.status = e.target.value;
        this.loadDecisions();
      });
    }

    const exportBtn = document.getElementById('export-decisions-csv-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        window.location.href = API.getExportDecisionsUrl();
      });
    }

    const reconcileForm = document.getElementById('reconcile-sale-form');
    if (reconcileForm) {
      reconcileForm.addEventListener('submit', (e) => this.handleReconcileSubmit(e));
    }
  },

  async loadDecisions() {
    const listContainer = document.getElementById('decisions-list-container');
    if (!listContainer) return;

    try {
      const res = await API.getDecisions(State.decisionFilters);
      if (!res.success) {
        listContainer.innerHTML = `<div class="empty-state"><p class="text-danger">Failed to load decisions.</p></div>`;
        return;
      }

      this.renderDecisions(res.data);
    } catch (err) {
      console.error('Error loading decisions:', err);
      listContainer.innerHTML = `<div class="empty-state"><p class="text-danger">${err.message}</p></div>`;
    }
  },

  renderDecisions(decisions) {
    const listContainer = document.getElementById('decisions-list-container');
    if (!listContainer) return;

    if (!decisions || decisions.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <h3>No Selling Decisions Logged Yet</h3>
          <p>Run a market comparison to discover the highest net return and click "Log Decision".</p>
          <button class="btn btn-primary" onclick="UI.switchView('comparison')" style="margin-top: 14px;">
            Go to Comparison Calculator
          </button>
        </div>
      `;
      return;
    }

    const html = decisions.map(d => {
      const isSold = d.status === 'Sold';
      const isDispatched = d.status === 'Dispatched';
      const isPlanned = d.status === 'Planned';

      let statusBadgeClass = 'badge-planned';
      if (isSold) statusBadgeClass = 'badge-sold';
      if (isDispatched) statusBadgeClass = 'badge-dispatched';
      if (d.status === 'Cancelled') statusBadgeClass = 'badge-cancelled';

      const estNetPerQtl = d.net_price_per_qtl_estimated;
      const realizedPrice = d.realized_price_per_qtl;
      const realizedNet = d.realized_net_return;

      return `
        <div class="decision-item-card">
          <div class="decision-top-line">
            <div>
              <span class="decision-crop-title">${d.crop?.name || 'Crop Lot'}</span>
              <span style="font-size: 0.85rem; color: var(--color-text-muted); margin-left: 6px;">
                (${d.grade?.grade_name || 'Standard Grade'})
              </span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="badge ${statusBadgeClass} badge-status">● ${d.status.toUpperCase()}</span>
              <span style="font-size: 0.8rem; color: var(--color-text-muted);">${d.decision_date}</span>
            </div>
          </div>

          <div class="decision-mandi-info">
            Target Market: <strong>${d.market?.name || 'Selected Mandi'}</strong> (${d.market?.district}, ${d.market?.state}) • 
            Planned Volume: <strong>${d.volume_qtl} Quintals</strong> • 
            Buyer: <strong>${d.buyer_name || 'Open APMC Auction'}</strong>
          </div>

          <div class="decision-metrics-strip">
            <div>
              <div class="comp-col-label">Headline Quote</div>
              <div class="comp-col-val">${UI.formatINR(d.headline_quote_per_qtl)}/qtl</div>
              <div style="font-size: 0.75rem; color: var(--color-text-muted);">Gross: ${UI.formatINR(d.gross_revenue_estimated)}</div>
            </div>
            <div>
              <div class="comp-col-label">Estimated Deductions</div>
              <div class="comp-col-val deduction-val">-${UI.formatINR(d.total_deductions_estimated)}</div>
              <div style="font-size: 0.75rem; color: var(--color-danger);">Freight + Hamali + Fees</div>
            </div>
            <div>
              <div class="comp-col-label">Planned Net Return</div>
              <div class="comp-col-val net-val">${UI.formatINR(d.net_return_estimated)}</div>
              <div style="font-size: 0.75rem; color: var(--color-primary); font-weight: 600;">${UI.formatINR(estNetPerQtl)}/qtl</div>
            </div>
            <div>
              <div class="comp-col-label">Actual Realized Net</div>
              <div class="comp-col-val" style="color: ${isSold ? 'var(--color-success)' : 'var(--color-text-muted)'}; font-weight: 800;">
                ${isSold ? UI.formatINR(realizedNet) : 'Pending Sale'}
              </div>
              <div style="font-size: 0.75rem; color: ${isSold ? 'var(--color-success)' : 'var(--color-text-muted)'};">
                ${isSold ? `Realized @ ${UI.formatINR(realizedPrice)}/qtl` : 'Waiting dispatch'}
              </div>
            </div>
          </div>

          <div class="decision-rationale-box">
            <strong>Decision Rationale:</strong> "${d.decision_rationale}"
          </div>

          ${d.variance_notes ? `
            <div style="background: #F0FDF4; border-left: 4px solid var(--color-success); padding: 8px 12px; font-size: 0.85rem; color: #166534; margin-bottom: 12px; border-radius: 0 4px 4px 0;">
              <strong>Sale Reconciliation & Reflection:</strong> ${d.variance_notes}
              ${d.sale_completion_date ? ` (Closed on ${d.sale_completion_date})` : ''}
            </div>
          ` : ''}

          <!-- Audit Trail & Actions -->
          <div class="decision-footer">
            <button class="btn btn-outline btn-sm" onclick="Decisions.viewAuditTrail('${d.id}')">
              📜 Audit Trail (${d.audits ? d.audits.length : 1} events)
            </button>

            <div style="display: flex; gap: 8px;">
              ${isPlanned ? `
                <button class="btn btn-outline btn-sm" onclick="Decisions.updateStatus('${d.id}', 'Dispatched')">
                  🚚 Mark Dispatched
                </button>
              ` : ''}

              ${!isSold ? `
                <button class="btn btn-primary btn-sm" onclick="Decisions.openReconcileModal('${d.id}')">
                  💰 Reconcile & Mark Sold
                </button>
                <button class="btn btn-outline btn-sm" style="color: var(--color-danger);" onclick="Decisions.updateStatus('${d.id}', 'Cancelled')">
                  Cancel
                </button>
              ` : `
                <span class="badge badge-sold">✓ Reconciled & Closed</span>
              `}

              <button class="btn btn-outline btn-sm" style="color: var(--color-danger); border-color: transparent;" onclick="Decisions.deleteDecision('${d.id}')">
                🗑️
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    listContainer.innerHTML = html;
  },

  async updateStatus(id, newStatus) {
    try {
      const res = await API.updateDecision(id, { status: newStatus });
      if (res.success) {
        UI.showToast(`Decision status changed to ${newStatus}.`, 'success');
        this.loadDecisions();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
      UI.showToast(err.message, 'error');
    }
  },

  async openReconcileModal(id) {
    try {
      const res = await API.getDecisionById(id);
      if (!res.success || !res.data) return;

      const d = res.data;
      State.selectedDecisionToReconcile = d;

      document.getElementById('reconcile-decision-id').value = d.id;
      document.getElementById('reconcile-crop-info').textContent = `${d.crop?.name} (${d.volume_qtl} Quintals) at ${d.market?.name}`;
      document.getElementById('reconcile-realized-price').value = d.headline_quote_per_qtl;
      document.getElementById('reconcile-realized-deductions').value = d.total_deductions_estimated;
      document.getElementById('reconcile-buyer-name').value = d.buyer_name || '';
      document.getElementById('reconcile-variance-notes').value = 'Auction completed smoothly. Deductions verified against mandi bill.';

      UI.openModal('reconcile-modal');
    } catch (err) {
      console.error('Error opening reconcile modal:', err);
      UI.showToast(err.message, 'error');
    }
  },

  async handleReconcileSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('reconcile-decision-id').value;
    const realizedPrice = Number(document.getElementById('reconcile-realized-price').value);
    const realizedDeductions = Number(document.getElementById('reconcile-realized-deductions').value);
    const buyerName = document.getElementById('reconcile-buyer-name').value;
    const varianceNotes = document.getElementById('reconcile-variance-notes').value;

    if (isNaN(realizedPrice) || realizedPrice <= 0) {
      UI.showToast('Please enter a valid realized price per quintal.', 'warning');
      return;
    }

    try {
      const res = await API.updateDecision(id, {
        status: 'Sold',
        realized_price_per_qtl: realizedPrice,
        realized_deductions_total: realizedDeductions,
        buyer_name: buyerName,
        variance_notes: varianceNotes,
        sale_completion_date: new Date().toISOString().split('T')[0]
      });

      if (res.success) {
        UI.closeModal('reconcile-modal');
        UI.showToast('Sale reconciled and net return realized!', 'success');
        this.loadDecisions();
      }
    } catch (err) {
      console.error('Reconciliation error:', err);
      UI.showToast(err.message, 'error');
    }
  },

  async viewAuditTrail(id) {
    try {
      const res = await API.getDecisionById(id);
      if (!res.success || !res.data) return;

      const d = res.data;
      const audits = d.audits || [];

      const container = document.getElementById('audit-trail-container');
      if (!container) return;

      container.innerHTML = `
        <h4 style="margin-bottom: 12px; color: var(--color-primary);">
          Audit History for ${d.crop?.name} at ${d.market?.name}
        </h4>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${audits.map(a => `
            <div class="audit-entry">
              <span class="audit-timestamp">${new Date(a.created_at).toLocaleString()}</span>
              <div>
                <strong>${a.action_type}</strong>: 
                ${a.previous_status ? `${a.previous_status} ➔ ` : ''} 
                <span class="badge badge-status">${a.new_status}</span>
                <div style="font-size: 0.775rem; color: var(--color-text-secondary); margin-top: 2px;">
                  ${JSON.stringify(a.details)} (IP: ${a.ip_address || '127.0.0.1'})
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `;

      UI.openModal('audit-modal');
    } catch (err) {
      console.error('Error fetching audit trail:', err);
      UI.showToast(err.message, 'error');
    }
  },

  async deleteDecision(id) {
    if (!confirm('Are you sure you want to remove this selling decision record?')) return;
    try {
      const res = await API.deleteDecision(id);
      if (res.success) {
        UI.showToast('Decision removed.', 'success');
        this.loadDecisions();
      }
    } catch (err) {
      console.error('Delete error:', err);
      UI.showToast(err.message, 'error');
    }
  }
};
