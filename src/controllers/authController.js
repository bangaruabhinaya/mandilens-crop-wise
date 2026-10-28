const { getDb } = require('../models/db');

async function getCurrentUser(req, res, next) {
  try {
    const user = req.user;
    res.json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
}

async function listPersonas(req, res, next) {
  try {
    const db = getDb();
    const users = await db.getUsers();
    res.json({
      success: true,
      data: users
    });
  } catch (err) {
    next(err);
  }
}

async function switchPersona(req, res, next) {
  try {
    const { userId } = req.body;
    const db = getDb();
    const user = await db.getUserById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'Demo persona not found.', code: 'NOT_FOUND' }
      });
    }

    res.json({
      success: true,
      message: `Active persona switched to ${user.full_name} (${user.role})`,
      data: user
    });
  } catch (err) {
    next(err);
  }
}

async function getDbHealth(req, res, next) {
  try {
    const db = getDb();
    const status = await db.getStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCurrentUser,
  listPersonas,
  switchPersona,
  getDbHealth
};
