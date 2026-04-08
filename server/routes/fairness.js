const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { 
  runFairnessEngine, 
  recalculateAfterRemoval,
  generateFairnessReport, 
  predictConfidence 
} = require('../services/fairnessEngine');

// POST /api/fairness/run/:fridayId (leader only)
router.post('/run/:fridayId', auth, async (req, res) => {
  try {
    if (req.user.role !== 'leader' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const result = await runFairnessEngine(req.params.fridayId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/fairness/recalculate-after-removal/:fridayId/:studentId
router.post('/recalculate-after-removal/:fridayId/:studentId', auth, async (req, res) => {
  try {
    if (req.user.role !== 'leader' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const result = await recalculateAfterRemoval(
      req.params.fridayId, req.params.studentId
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/fairness/report/:semesterId
router.get('/report/:semesterId', auth, async (req, res) => {
  try {
    const report = await generateFairnessReport(req.params.semesterId);
    res.json(report);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/fairness/predict/:studentId/:fridayId
router.get('/predict/:studentId/:fridayId', auth, async (req, res) => {
  try {
    const prediction = await predictConfidence(
      req.params.studentId, req.params.fridayId
    );
    res.json(prediction);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
