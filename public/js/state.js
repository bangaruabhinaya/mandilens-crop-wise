/**
 * Global Reactive Frontend State
 */

const State = {
  currentUser: null,
  personas: [],
  crops: [],
  markets: [],
  currentGrades: [],
  activeView: 'landing',

  // Comparison Workspace State
  comparisonInputs: {
    cropId: '11111111-0000-0000-0000-000000000001',
    gradeId: '22222222-0000-0000-0000-000000000001',
    volumeQtl: 65,
    transportRatePerKmQtl: 0.85,
    handlingPerQtl: 18.0,
    commissionPct: 2.0,
    marketCessPct: 1.0,
    packagingPerQtl: 20.0,
    qualityDeductionPerQtl: 0.0,
    customDistances: {}
  },
  comparisonResults: null,

  // Selected item for modals
  selectedDecisionToReconcile: null,
  selectedDecisionAuditTrail: null,
  selectedQuoteForDecision: null,

  // Quotes filters
  quoteFilters: {
    crop_id: '',
    market_id: '',
    stale_only: false,
    sort_by: 'price',
    sort_order: 'desc'
  },

  // Decisions filters
  decisionFilters: {
    status: '',
    crop_id: ''
  }
};
