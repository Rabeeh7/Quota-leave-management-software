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
const FridayCalendar = require('../models/FridayCalendar');
const { generateSemesterCalendar, getCalendarStats } = require('../services/calendarEngine');

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

// POST /api/superadmin/departments
router.post('/departments', async (req, res) => {
  try {
    const { name, institution } = req.body;
    if (!name || !institution) {
      return res.status(400).json({ message: 'Name and institution are required' });
    }

    const code = name
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .toUpperCase()
      .substring(0, 20) + '-' + Date.now().toString().slice(-4);

    const department = await Department.create({
      name,
      code,
      institution,
      status: 'active',
      approved_by: req.user._id
    });

    res.status(201).json(department);
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
      user.username = email.toLowerCase();
      user.is_active = true;
      await user.save();
    } else {
      // Create new user
      user = await User.create({
        name,
        username: email.toLowerCase(),
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
      const avgQuota = profiles.length > 0 
        ? profiles.reduce((sum, p) => sum + p.total_leaves, 0) / profiles.length 
        : 0;

      return {
        department_id: dept._id,
        name: dept.name,
        institution: dept.institution,
        student_count: students,
        avg_quota: Math.round(avgQuota * 100) / 100
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

// POST /api/superadmin/semester/setup
router.post('/semester/setup', async (req, res) => {
  try {
    const { 
      semester_name, start_date, end_date, 
      max_friday_slots, quota_percentage,
      request_open_day, request_open_time,
      request_deadline_day, request_deadline_time,
      swap_enabled, emergency_limit,
      exam_periods, break_periods
    } = req.body;

    // Deactivate existing global semester
    await Semester.updateMany({ is_active: true }, { is_active: false });

    // Count globally active students
    const total_students = await User.countDocuments({ role: 'student', is_active: true });

    // Create global semester
    const semester = await Semester.create({
      semester_name,
      start_date,
      end_date,
      total_students,
      max_friday_slots: max_friday_slots || 12,
      quota_percentage: quota_percentage || 33,
      request_open_day: request_open_day || 'Tuesday',
      request_open_time: request_open_time || '00:00',
      request_deadline_day: request_deadline_day || 'Wednesday',
      request_deadline_time: request_deadline_time || '09:00',
      swap_enabled: swap_enabled !== false,
      emergency_limit: emergency_limit || 2,
      is_active: true
    });

    // Generate calendar per department
    const departments = await Department.find();
    let calendarCount = 0;
    
    for (const dept of departments) {
      const calendar = await generateSemesterCalendar({
        department_id: dept._id,
        semester_id: semester._id,
        start_date,
        end_date,
        total_slots: max_friday_slots || 12,
        exam_periods: exam_periods || [],
        break_periods: break_periods || [],
        tour_dates: [],
        holiday_dates: []
      });
      calendarCount += calendar.length;
    }

    // Assign globally
    const students = await User.find({ role: 'student', is_active: true });
    for (const student of students) {
      const existingProfile = await StudentProfile.findOne({ 
        user_id: student._id, semester_id: semester._id 
      });
      if (!existingProfile) {
        await StudentProfile.create({
          user_id: student._id,
          department_id: student.department_id,
          semester_id: semester._id
        });
      }
    }

    const stats = await getCalendarStats(semester._id, total_students);

    res.status(201).json({ semester, calendar_count: calendarCount, stats });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/superadmin/semester/active
router.get('/semester/active', async (req, res) => {
  try {
    const semester = await Semester.findOne({ is_active: true });
    if (!semester) return res.status(404).json({ message: 'No active semester' });

    const stats = await getCalendarStats(semester._id, semester.total_students);
    res.json({ semester, stats });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/superadmin/friday/list/:departmentId
router.get('/friday/list/:departmentId', async (req, res) => {
  try {
    const semester = await Semester.findOne({ is_active: true });
    if (!semester) return res.json([]);
    const fridays = await FridayCalendar.find({ 
      semester_id: semester._id,
      department_id: req.params.departmentId
    }).sort({ friday_date: 1 });
    
    const enriched = await Promise.all(fridays.map(async (f) => {
      const allocationCount = await LeaveAllocation.countDocuments({ friday_id: f._id, released: false });
      const requestCount = await LeaveRequest.countDocuments({ friday_id: f._id, status: 'pending' });
      return { ...f.toObject(), allocation_count: allocationCount, request_count: requestCount };
    }));

    res.json(enriched);
  } catch (error) { res.status(500).json({ message: 'Server error' }); }
});

// PUT /api/superadmin/friday/:id/block
router.put('/friday/:id/block', async (req, res) => {
  try {
    const { block_reason, block_type } = req.body;
    const friday = await FridayCalendar.findById(req.params.id);
    if (!friday) return res.status(404).json({ message: 'Friday not found' });
    
    friday.status = 'blocked';
    friday.block_reason = block_reason || 'Blocked by Super Admin';
    friday.block_type = block_type || 'hod_order';
    await friday.save();

    res.json({ message: 'Friday blocked', friday });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

// PUT /api/superadmin/friday/:id/unblock
router.put('/friday/:id/unblock', async (req, res) => {
  try {
    const friday = await FridayCalendar.findById(req.params.id);
    if (!friday) return res.status(404).json({ message: 'Friday not found' });
    
    friday.status = 'open';
    friday.block_reason = null;
    friday.block_type = null;
    await friday.save();

    res.json({ message: 'Friday unblocked', friday });
  } catch (error) { res.status(500).json({ message: 'Server error', error: error.message }); }
});

// GET /api/superadmin/friday/:id/allocations
router.get('/friday/:id/allocations', async (req, res) => {
  try {
    const allocations = await LeaveAllocation.find({ 
      friday_id: req.params.id, released: false 
    }).populate('student_id', 'name roll_no phone');
    res.json(allocations);
  } catch (error) { res.status(500).json({ message: 'Server error' }); }
});

// POST /api/superadmin/friday/:id/publish
router.post('/friday/:id/publish', async (req, res) => {
  try {
    const friday = await FridayCalendar.findById(req.params.id);
    if (!friday) return res.status(404).json({ message: 'Friday not found' });

    friday.status = 'published';
    await friday.save();

    const Notification = require('../models/Notification');
    const allocations = await LeaveAllocation.find({ friday_id: friday._id, released: false });
    for (const alloc of allocations) {
      await Notification.create({
        user_id: alloc.student_id,
        message: `The list for ${friday.friday_date.toLocaleDateString()} is published!`,
        type: 'published'
      });
    }
    res.json({ message: 'List published', friday });
  } catch (error) { res.status(500).json({ message: 'Server error' }); }
});

// GET /api/superadmin/whatsapp-export/:id
router.get('/whatsapp-export/:id', async (req, res) => {
  try {
    const friday = await FridayCalendar.findById(req.params.id);
    if (!friday) return res.status(404).json({ message: 'Friday not found' });

    const allocations = await LeaveAllocation.find({ 
      friday_id: friday._id, released: false 
    }).populate('student_id', 'name roll_no phone');

    const totalStudents = await User.countDocuments({ 
      department_id: friday.department_id, role: 'student', is_active: true 
    });

    const dateStr = friday.friday_date.toLocaleDateString('en-IN', { 
      weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' 
    });

    let text = `Quota Manager — ${dateStr}\n`;
    text += `Approved Students (${allocations.length}/${totalStudents}):\n\n`;

    allocations.forEach((a, i) => {
      text += `${i + 1}. ${a.student_id.name} — ${a.student_id.roll_no}\n`;
    });

    text += `\nGenerated by Quota Manager`;

    res.json({ text, allocations_count: allocations.length });
  } catch (error) { res.status(500).json({ message: 'Server error' }); }
});

// GET /api/superadmin/students/list/:departmentId
router.get('/students/list/:departmentId', async (req, res) => {
  try {
    const department_id = req.params.departmentId;
    const students = await User.find({ department_id, role: 'student' })
      .select('-password').sort({ roll_no: 1 });

    const activeSemester = await Semester.findOne({ is_active: true });
    const enriched = await Promise.all(students.map(async (s) => {
      let profile = null;
      if (activeSemester) {
        profile = await StudentProfile.findOne({ user_id: s._id, semester_id: activeSemester._id });
      }
      return { ...s.toObject(), profile: profile ? profile.toObject() : null };
    }));

    res.json(enriched);
  } catch (error) { res.status(500).json({ message: 'Server error' }); }
});

// PUT /api/superadmin/students/:id/toggle-active
router.put('/students/:id/toggle-active', async (req, res) => {
  try {
    const student = await User.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    student.is_active = !student.is_active;
    await student.save();
    res.json({ message: `Student ${student.is_active ? 'activated' : 'deactivated'}`, student });
  } catch (error) { res.status(500).json({ message: 'Server error' }); }
});

// DELETE /api/superadmin/students/:id
router.delete('/students/:id', async (req, res) => {
  try {
    const student = await User.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    
    // Delete profile and allocations too
    await StudentProfile.deleteMany({ user_id: student._id });
    await LeaveAllocation.deleteMany({ student_id: student._id });
    const LeaveRequest = require('../models/LeaveRequest');
    await LeaveRequest.deleteMany({ student_id: student._id });
    await User.findByIdAndDelete(student._id);

    res.json({ message: 'Student permanently deleted' });
  } catch (error) { res.status(500).json({ message: 'Server error' }); }
});

module.exports = router;
