/**
 * Market Quotes Intelligence Controller
 */

const Quotes = {
  async init() {
    this.bindEvents();
  },

  bindEvents() {
    const cropFilter = document.getElementById('quotes-crop-filter');
    if (cropFilter) {
      cropFilter.addEventListener('change', (e) => {
        State.quoteFilters.crop_id = e.target.value;
        this.loadQuotes();
      });
    }

    const marketFilter = document.getElementById('quotes-market-filter');
    if (marketFilter) {
      marketFilter.addEventListener('change', (e) => {
        State.quoteFilters.market_id = e.target.value;
        this.loadQuotes();
      });
    }

    const staleCheckbox = document.getElementById('quotes-stale-toggle');
    if (staleCheckbox) {
      staleCheckbox.addEventListener('change', (e) => {
        State.quoteFilters.stale_only = e.target.checked;
        this.loadQuotes();
      });
    }

    const sortSelect = document.getElementById('quotes-sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        State.quoteFilters.sort_by = e.target.value;
        this.loadQuotes();
      });
    }

    const exportBtn = document.getElementById('export-quotes-csv-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        window.location.href = API.getExportQuotesUrl();
      });
    }

    // Modal triggers
    const addQuoteBtn = document.getElementById('open-add-quote-btn');
    if (addQuoteBtn) {
      addQuoteBtn.addEventListener('click', () => this.openAddQuoteModal());
    }

    const addQuoteForm = document.getElementById('add-quote-form');
    if (addQuoteForm) {
      addQuoteForm.addEventListener('submit', (e) => this.handleAddQuoteSubmit(e));
    }

    const importCsvBtn = document.getElementById('open-import-csv-btn');
    if (importCsvBtn) {
      importCsvBtn.addEventListener('click', () => UI.openModal('import-csv-modal'));
    }

    const importCsvForm = document.getElementById('import-csv-form');
    if (importCsvForm) {
      importCsvForm.addEventListener('submit', (e) => this.handleImportCsvSubmit(e));
    }
  },

  async loadQuotes() {
    const tableBody = document.getElementById('quotes-table-body');
    if (!tableBody) return;

    try {
      const res = await API.getQuotes(State.quoteFilters);
      if (!res.success) {
        tableBody.innerHTML = `<tr><td colspan="8" class="text-danger">Failed to load quotes.</td></tr>`;
        return;
      }

      this.renderQuotesTable(res.data);
    } catch (err) {
      console.error('Error loading quotes:', err);
      tableBody.innerHTML = `<tr><td colspan="8" class="text-danger">${err.message}</td></tr>`;
    }
  },

  renderQuotesTable(quotes) {
    const tableBody = document.getElementById('quotes-table-body');
    if (!tableBody) return;

    if (!quotes || quotes.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 32px; color: var(--color-text-muted);">
            No quotes match the selected filters.
          </td>
        </tr>
      `;
      return;
    }

    const html = quotes.map(q => {
      const freshnessClass = q.is_stale ? 'badge-stale' : 'badge-fresh';

      return `
        <tr>
          <td><strong>${q.quote_date}</strong></td>
          <td>
            <strong>${q.crop?.name || 'Crop'}</strong>
            <div style="font-size: 0.775rem; color: var(--color-text-muted);">${q.grade?.grade_name || 'FAQ'}</div>
          </td>
          <td>
            <strong>${q.market?.name || 'Mandi'}</strong>
            <div style="font-size: 0.775rem; color: var(--color-text-muted);">${q.market?.district}, ${q.market?.state}</div>
          </td>
          <td>
            <strong style="color: var(--color-primary); font-size: 1.05rem;">${UI.formatINR(q.modal_price)}</strong>
            <div style="font-size: 0.75rem; color: var(--color-text-muted);">Range: ₹${q.min_price} - ₹${q.max_price}</div>
          </td>
          <td>${UI.formatQtl(q.arrival_volume_qtl)}</td>
          <td>
            <span class="badge ${freshnessClass}">
              ${q.is_stale ? '⚠️ Stale' : '✓ Fresh'} (${q.age_hours}h)
            </span>
          </td>
          <td>
            <span style="font-size: 0.8rem;">${q.source}</span>
          </td>
          <td>
            <button class="btn btn-outline btn-sm" onclick="Quotes.useQuoteInComparison('${q.crop_id}', '${q.grade_id}')">
              ⚡ Compare Net
            </button>
          </td>
        </tr>
      `;
    }).join('');

    tableBody.innerHTML = html;
  },

  useQuoteInComparison(cropId, gradeId) {
    State.comparisonInputs.cropId = cropId;
    State.comparisonInputs.gradeId = gradeId;
    UI.switchView('comparison');
  },

  async openAddQuoteModal() {
    const cropSelect = document.getElementById('new-quote-crop');
    const marketSelect = document.getElementById('new-quote-market');

    if (cropSelect && State.crops.length > 0) {
      cropSelect.innerHTML = State.crops.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
      await this.updateGradeOptions(State.crops[0].id);
      cropSelect.onchange = (e) => this.updateGradeOptions(e.target.value);
    }

    if (marketSelect && State.markets.length > 0) {
      marketSelect.innerHTML = State.markets.map(m => `<option value="${m.id}">${m.name} (${m.district})</option>`).join('');
    }

    document.getElementById('new-quote-date').value = new Date().toISOString().split('T')[0];
    UI.openModal('add-quote-modal');
  },

  async updateGradeOptions(cropId) {
    const gradeSelect = document.getElementById('new-quote-grade');
    if (!gradeSelect) return;
    try {
      const gradesRes = await API.getCropGrades(cropId);
      if (gradesRes.success && gradesRes.data) {
        gradeSelect.innerHTML = gradesRes.data.map(g => `<option value="${g.id}">${g.grade_name}</option>`).join('');
      }
    } catch (err) {
      console.error(err);
    }
  },

  async handleAddQuoteSubmit(e) {
    e.preventDefault();
    const crop_id = document.getElementById('new-quote-crop').value;
    const grade_id = document.getElementById('new-quote-grade').value;
    const market_id = document.getElementById('new-quote-market').value;
    const modal_price = Number(document.getElementById('new-quote-modal-price').value);
    const min_price = Number(document.getElementById('new-quote-min-price').value) || modal_price;
    const max_price = Number(document.getElementById('new-quote-max-price').value) || modal_price;
    const arrival_volume_qtl = Number(document.getElementById('new-quote-volume').value) || 0;
    const source = document.getElementById('new-quote-source').value;
    const quote_date = document.getElementById('new-quote-date').value;
    const notes = document.getElementById('new-quote-notes').value;

    try {
      const res = await API.createQuote({
        crop_id,
        grade_id,
        market_id,
        modal_price,
        min_price,
        max_price,
        arrival_volume_qtl,
        source,
        quote_date,
        notes
      });

      if (res.success) {
        UI.closeModal('add-quote-modal');
        UI.showToast('Mandi quote submitted successfully!', 'success');
        this.loadQuotes();
      }
    } catch (err) {
      console.error('Quote submission error:', err);
      UI.showToast(err.message, 'error');
    }
  },

  async handleImportCsvSubmit(e) {
    e.preventDefault();
    const csvText = document.getElementById('csv-import-textarea').value;
    if (!csvText || !csvText.trim()) {
      UI.showToast('Please paste valid CSV data.', 'warning');
      return;
    }

    try {
      const res = await API.importQuotesCsv(csvText);
      if (res.success) {
        UI.closeModal('import-csv-modal');
        const count = res.summary?.successCount || 0;
        const errors = res.summary?.errorCount || 0;
        UI.showToast(`Imported ${count} quotes successfully! (${errors} skipped)`, errors > 0 ? 'warning' : 'success');
        this.loadQuotes();
      }
    } catch (err) {
      console.error('CSV Import error:', err);
      UI.showToast(err.message, 'error');
    }
  }
};
