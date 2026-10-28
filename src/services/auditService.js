/**
 * Audit Trail Service
 * Records status transitions and state changes for selling decisions.
 */

const { getDb } = require('../models/db');

async function recordDecisionAudit({
  decisionId,
  userId,
  previousStatus,
  newStatus,
  actionType,
  details = {},
  ipAddress = '127.0.0.1'
}) {
  const db = getDb();
  const entry = {
    decision_id: decisionId,
    changed_by: userId,
    previous_status: previousStatus,
    new_status: newStatus,
    action_type: actionType,
    details,
    ip_address: ipAddress,
    created_at: new Date().toISOString()
  };

  return await db.insertAuditLog(entry);
}

module.exports = {
  recordDecisionAudit
};
