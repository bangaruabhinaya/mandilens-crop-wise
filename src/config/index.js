require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  },
  settings: {
    staleQuoteThresholdHours: parseInt(process.env.STALE_QUOTE_THRESHOLD_HOURS || '48', 10),
    defaultTransportRatePerKmQtl: parseFloat(process.env.DEFAULT_TRANSPORT_RATE || '0.85'),
    appName: 'Crop-Wise Market Price Comparison and Selling Decision Log',
    version: '1.0.0'
  }
};
