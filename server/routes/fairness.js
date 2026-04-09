const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { 
  runRotationEngine, 
  recalculateAfterRemoval,
  generateRotationReport, 
  predictConfidence,
  publishList,
  requestSwap,
  acceptSwap
} = require('../services/fairnessEngine'); // File name kept intact

// POST /api/fairness/publish/:fridayId (leader/admin only)
router.post('/publish/:fridayId', auth, async (req, res) => {
  try {
    if (req.user.role !== 'leader' && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const result = await publishList(req.params.fridayId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/fairness/run/:fridayId (leader only) - Preview list
router.post('/run/:fridayId', auth, async (req, res) => {
  try {
    if (req.user.role !== 'leader' && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const result = await runRotationEngine(req.params.fridayId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/fairness/recalculate-after-removal/:fridayId/:studentId
router.post('/recalculate-after-removal/:fridayId/:studentId', auth, async (req, res) => {
  try {
    if (req.user.role !== 'leader' && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
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
    const report = await generateRotationReport(req.params.semesterId);
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

// POST /api/fairness/swap/request
router.post('/swap/request', auth, async (req, res) => {
  try {
    const { allocationId } = req.body;
    const result = await requestSwap(allocationId, req.user._id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// POST /api/fairness/swap/accept
router.post('/swap/accept', auth, async (req, res) => {
  try {
    const { allocationId, requesterId } = req.body;
    const result = await acceptSwap(allocationId, req.user._id, requesterId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
