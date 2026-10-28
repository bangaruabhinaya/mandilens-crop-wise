/**
 * API Client Layer
 * Communicates with Node.js & Express REST Endpoints
 */

const API = {
  activeUserId: localStorage.getItem('crop_active_user_id') || '00000000-0000-0000-0000-000000000001',

  setActiveUserId(id) {
    this.activeUserId = id;
    localStorage.setItem('crop_active_user_id', id);
  },

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'x-user-id': this.activeUserId,
      ...(options.headers || {})
    };

    try {
      const response = await fetch(endpoint, {
        ...options,
        headers
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || `Request failed with status ${response.status}`);
      }
      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err);
      throw err;
    }
  },

  // Auth & Personas
  async getCurrentUser() {
    return this.request('/api/auth/me');
  },

  async getPersonas() {
    return this.request('/api/auth/personas');
  },

  async switchPersona(userId) {
    this.setActiveUserId(userId);
    return this.request('/api/auth/switch-persona', {
      method: 'POST',
      body: JSON.stringify({ userId })
    });
  },

  async getDbStatus() {
    return this.request('/api/auth/status');
  },

  // Crops & Grades
  async getCrops() {
    return this.request('/api/crops');
  },

  async getCropById(id) {
    return this.request(`/api/crops/${id}`);
  },

  async getCropGrades(cropId) {
    const query = cropId ? `?cropId=${cropId}` : '';
    return this.request(`/api/crops/grades${query}`);
  },

  async createCrop(data) {
    return this.request('/api/crops', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async createGrade(data) {
    return this.request('/api/crops/grades', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Markets
  async getMarkets() {
    return this.request('/api/markets');
  },

  async createMarket(data) {
    return this.request('/api/markets', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Quotes
  async getQuotes(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request(`/api/quotes${q ? '?' + q : ''}`);
  },

  async getQuoteById(id) {
    return this.request(`/api/quotes/${id}`);
  },

  async createQuote(data) {
    return this.request('/api/quotes', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Comparison
  async runComparison(payload) {
    return this.request('/api/comparison/compare', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async quickCalculate(payload) {
    return this.request('/api/comparison/quick-calculate', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  // Decisions
  async getDecisions(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.request(`/api/decisions${q ? '?' + q : ''}`);
  },

  async getDecisionById(id) {
    return this.request(`/api/decisions/${id}`);
  },

  async createDecision(data) {
    return this.request('/api/decisions', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateDecision(id, updates) {
    return this.request(`/api/decisions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  },

  async deleteDecision(id) {
    return this.request(`/api/decisions/${id}`, {
      method: 'DELETE'
    });
  },

  // CSV Import/Export
  getExportQuotesUrl() {
    return '/api/csv/export-quotes';
  },

  getExportDecisionsUrl() {
    return `/api/csv/export-decisions?persona_id=${this.activeUserId}`;
  },

  async importQuotesCsv(csvText) {
    return this.request('/api/csv/import-quotes', {
      method: 'POST',
      body: JSON.stringify({ csv_text: csvText })
    });
  },

  // Analytics
  async getDashboardMetrics() {
    return this.request('/api/analytics/dashboard');
  },

  async getPriceHistory(cropId, days = 14) {
    return this.request(`/api/analytics/price-history?crop_id=${cropId || ''}&days=${days}`);
  }
};
