const express = require('express');
const router = express.Router();
const DepartmentRequest = require('../models/DepartmentRequest');

// POST /api/department-requests (public, no auth)
router.post('/', async (req, res) => {
  try {
    const { 
      department_name, institution, requester_name, 
      requester_email, requester_phone, class_size, message 
    } = req.body;

    if (!department_name || !institution || !requester_name || !requester_email) {
      return res.status(400).json({ 
        message: 'Department name, institution, name, and email are required' 
      });
    }

    const request = await DepartmentRequest.create({
      department_name,
      institution,
      requester_name,
      requester_email: requester_email.toLowerCase(),
      requester_phone,
      class_size,
      message
    });

    res.status(201).json({ 
      message: 'Request submitted successfully. Super Admin will review it.',
      request_id: request._id 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/department-requests/:id (check status)
router.get('/:id', async (req, res) => {
  try {
    const request = await DepartmentRequest.findById(req.params.id)
      .select('department_name institution status created_at');
    
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    res.json(request);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/department-requests/check/email/:email
router.get('/check/email/:email', async (req, res) => {
  try {
    const requests = await DepartmentRequest.find({ 
      requester_email: req.params.email.toLowerCase() 
    }).select('department_name institution status created_at');
    
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
