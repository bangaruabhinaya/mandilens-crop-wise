/**
 * Centralized Error Handling Middleware
 */

function errorHandler(err, req, res, next) {
  console.error('[Error]', err.stack || err.message);

  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: {
      message: err.message || 'Internal Server Error',
      code: err.code || 'INTERNAL_ERROR',
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    }
  });
}

module.exports = {
  errorHandler
};
