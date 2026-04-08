const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const Department = require('../models/Department');
const DepartmentRequest = require('../models/DepartmentRequest');
const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const Semester = require('../models/Semester');
const LeaveAllocation = require('../models/LeaveAllocation');

// All routes require superadmin
router.use(auth, roleGuard('superadmin'));

// GET /api/superadmin/departments
router.get('/departments', async (req, res) => {
  try {
    const departments = await Department.find()
      .populate('approved_by', 'name email')
      .sort({ created_at: -1 });

    // Enrich with student count and leader info
    const enriched = await Promise.all(departments.map(async (dept) => {
      const studentCount = await User.countDocuments({ 
        department_id: dept._id, role: 'student', is_active: true 
      });
      const leader = await User.findOne({ 
        department_id: dept._id, role: 'leader' 
      }).select('name email');
      
      return {
        ...dept.toObject(),
        student_count: studentCount,
        leader: leader || null
      };
    }));

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/superadmin/departments/approve/:requestId
router.post('/departments/approve/:requestId', async (req, res) => {
  try {
    const request = await DepartmentRequest.findById(req.params.requestId);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Request already processed' });
    }

    // Create department
    const code = request.department_name
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .toUpperCase()
      .substring(0, 20) + '-' + Date.now().toString().slice(-4);

    const department = await Department.create({
      name: request.department_name,
      code,
      institution: request.institution,
      requested_by: request.requester_email,
      status: 'active',
      approved_by: req.user._id
    });

    request.status = 'approved';
    request.reviewed_by = req.user._id;
    await request.save();

    res.json({ 
      message: 'Department approved and created', 
      department 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/superadmin/departments/reject/:requestId
router.post('/departments/reject/:requestId', async (req, res) => {
  try {
    const request = await DepartmentRequest.findById(req.params.requestId);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    request.status = 'rejected';
    request.reviewed_by = req.user._id;
    await request.save();

    res.json({ message: 'Request rejected' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/superadmin/leaders/appoint
router.post('/leaders/appoint', async (req, res) => {
  try {
    const { name, email, password, phone, department_id } = req.body;

    const dept = await Department.findById(department_id);
    if (!dept) return res.status(404).json({ message: 'Department not found' });

    // Check if leader already exists for this department
    const existingLeader = await User.findOne({ 
      department_id, role: 'leader' 
    });
    if (existingLeader) {
      return res.status(400).json({ 
        message: 'Department already has a leader. Remove existing leader first.' 
      });
    }

    // Check if user with this email exists
    let user = await User.findOne({ email: email.toLowerCase() });
    
    if (user) {
      // Update existing user to leader
      user.role = 'leader';
      user.department_id = department_id;
      user.is_active = true;
      await user.save();
    } else {
      // Create new user
      user = await User.create({
        name,
        email: email.toLowerCase(),
        password,
        phone,
        role: 'leader',
        department_id
      });
    }

    res.json({ message: 'Leader appointed successfully', user: { 
      _id: user._id, name: user.name, email: user.email, role: user.role 
    }});
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE /api/superadmin/leaders/remove/:userId
router.delete('/leaders/remove/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.role !== 'leader') {
      return res.status(400).json({ message: 'User is not a leader' });
    }

    user.role = 'student';
    user.is_active = false;
    await user.save();

    res.json({ message: 'Leader removed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/superadmin/analytics
router.get('/analytics', async (req, res) => {
  try {
    const departments = await Department.find({ status: 'active' });
    const totalStudents = await User.countDocuments({ role: 'student', is_active: true });
    const activeSemesters = await Semester.countDocuments({ is_active: true });
    const pendingRequests = await DepartmentRequest.countDocuments({ status: 'pending' });

    // Per-department stats
    const deptStats = await Promise.all(departments.map(async (dept) => {
      const students = await User.countDocuments({ 
        department_id: dept._id, role: 'student', is_active: true 
      });
      const profiles = await StudentProfile.find({ department_id: dept._id });
      const avgFairness = profiles.length > 0 
        ? profiles.reduce((sum, p) => sum + p.fairness_score, 0) / profiles.length 
        : 0;

      return {
        department_id: dept._id,
        name: dept.name,
        institution: dept.institution,
        student_count: students,
        avg_fairness: Math.round(avgFairness * 100) / 100
      };
    }));

    res.json({
      total_departments: departments.length,
      total_students: totalStudents,
      active_semesters: activeSemesters,
      pending_requests: pendingRequests,
      department_stats: deptStats
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/superadmin/requests
router.get('/requests', async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const requests = await DepartmentRequest.find(filter)
      .populate('reviewed_by', 'name email')
      .sort({ created_at: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
