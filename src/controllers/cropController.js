const { getDb } = require('../models/db');

async function getCrops(req, res, next) {
  try {
    const db = getDb();
    const crops = await db.getCrops();
    res.json({
      success: true,
      data: crops
    });
  } catch (err) {
    next(err);
  }
}

async function getCropById(req, res, next) {
  try {
    const { id } = req.params;
    const db = getDb();
    const crop = await db.getCropById(id);
    if (!crop) {
      return res.status(404).json({
        success: false,
        error: { message: 'Crop not found', code: 'NOT_FOUND' }
      });
    }

    const grades = await db.getCropGrades(id);
    res.json({
      success: true,
      data: { ...crop, grades }
    });
  } catch (err) {
    next(err);
  }
}

async function getCropGrades(req, res, next) {
  try {
    const { cropId } = req.query;
    const db = getDb();
    const grades = await db.getCropGrades(cropId);
    res.json({
      success: true,
      data: grades
    });
  } catch (err) {
    next(err);
  }
}

async function createCrop(req, res, next) {
  try {
    const { name, category, standard_unit, shelf_life_days, moisture_standard_percent } = req.body;
    if (!name || !category) {
      return res.status(400).json({
        success: false,
        error: { message: 'Crop name and category are required.', code: 'VALIDATION_ERROR' }
      });
    }

    const code = name.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
    const db = getDb();
    const crop = await db.createCrop({
      code,
      name,
      category,
      standard_unit: standard_unit || 'Quintal',
      shelf_life_days: Number(shelf_life_days) || 180,
      moisture_standard_percent: Number(moisture_standard_percent) || 12.0
    });

    res.status(201).json({
      success: true,
      message: 'Crop created successfully',
      data: crop
    });
  } catch (err) {
    next(err);
  }
}

async function createGrade(req, res, next) {
  try {
    const { crop_id, grade_name, specifications, price_multiplier } = req.body;
    if (!crop_id || !grade_name) {
      return res.status(400).json({
        success: false,
        error: { message: 'Crop ID and grade name are required.', code: 'VALIDATION_ERROR' }
      });
    }

    const db = getDb();
    const grade = await db.createGrade({
      crop_id,
      grade_name,
      specifications: specifications || '',
      price_multiplier: Number(price_multiplier) || 1.0
    });

    res.status(201).json({
      success: true,
      message: 'Crop grade added successfully',
      data: grade
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCrops,
  getCropById,
  getCropGrades,
  createCrop,
  createGrade
};
