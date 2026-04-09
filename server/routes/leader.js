const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const Semester = require('../models/Semester');
const FridayCalendar = require('../models/FridayCalendar');
const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const LeaveRequest = require('../models/LeaveRequest');
const LeaveAllocation = require('../models/LeaveAllocation');
const OverrideLog = require('../models/OverrideLog');
const Notification = require('../models/Notification');
const { generateSemesterCalendar, getCalendarStats } = require('../services/calendarEngine');
const { runRotationEngine, recalculateAfterRemoval } = require('../services/fairnessEngine');
const { generateWarnings } = require('../services/warningEngine');

router.use(auth, roleGuard('leader'));

// ============ SEMESTER ============

// POST /api/leader/semester/setup
router.post('/semester/setup', async (req, res) => {
  try {
    const { 
      semester_name, start_date, end_date, 
      max_friday_slots, quota_percentage,
      request_deadline_day, request_deadline_time,
      swap_enabled, emergency_limit,
      exam_periods, break_periods, tour_dates, holiday_dates 
    } = req.body;

    const department_id = req.user.department_id;

    // Deactivate any existing active semester
    await Semester.updateMany(
      { department_id, is_active: true },
      { is_active: false }
    );

    // Count students
    const total_students = await User.countDocuments({ 
      department_id, role: 'student', is_active: true 
    });

    // Create semester
    const semester = await Semester.create({
      department_id,
      semester_name,
      start_date,
      end_date,
      total_students,
      max_friday_slots: max_friday_slots || 12,
      quota_percentage: quota_percentage || 33,
      request_deadline_day: request_deadline_day || 'Wednesday',
      request_deadline_time: request_deadline_time || '09:00',
      swap_enabled: swap_enabled !== false,
      emergency_limit: emergency_limit || 2,
      is_active: true
    });

    // Generate calendar
    const calendar = await generateSemesterCalendar({
      department_id,
      semester_id: semester._id,
      start_date,
      end_date,
      total_slots: max_friday_slots || 12,
      exam_periods: exam_periods || [],
      break_periods: break_periods || [],
      tour_dates: tour_dates || [],
      holiday_dates: holiday_dates || []
    });

    // Create/update student profiles for this semester
    const students = await User.find({ department_id, role: 'student', is_active: true });
    for (const student of students) {
      const existingProfile = await StudentProfile.findOne({ 
        user_id: student._id, semester_id: semester._id 
      });
      if (!existingProfile) {
        await StudentProfile.create({
          user_id: student._id,
          department_id,
          semester_id: semester._id
        });
      }
    }

    const stats = await getCalendarStats(semester._id, total_students);

    res.status(201).json({ 
      semester, 
      calendar_count: calendar.length,
      stats 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/leader/semester/:id
router.get('/semester/:id', async (req, res) => {
  try {
    const semester = await Semester.findById(req.params.id);
    if (!semester) return res.status(404).json({ message: 'Semester not found' });

    const stats = await getCalendarStats(semester._id, semester.total_students);
    res.json({ semester, stats });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/leader/semester/active/current
router.get('/semester/active/current', async (req, res) => {
  try {
    const semester = await Semester.findOne({ 
      department_id: req.user.department_id, 
      is_active: true 
    });
    if (!semester) return res.status(404).json({ message: 'No active semester' });

    const stats = await getCalendarStats(semester._id, semester.total_students);
    res.json({ semester, stats });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ============ FRIDAY MANAGEMENT ============

// PUT /api/leader/friday/:id/block
router.put('/friday/:id/block', async (req, res) => {
  try {
    const { block_reason, block_type } = req.body;
    const friday = await FridayCalendar.findById(req.params.id);
    if (!friday) return res.status(404).json({ message: 'Friday not found' });

    // Check for pending requests on this Friday
    const pendingRequests = await LeaveRequest.find({ 
      friday_id: friday._id, status: 'pending' 
    });

    friday.status = 'blocked';
    friday.block_reason = block_reason || 'Blocked by leader';
    friday.block_type = block_type || 'hod_order';
    await friday.save();

    // Handle pending requests
    if (pendingRequests.length > 0) {
      // Find next open Friday
      const nextFriday = await FridayCalendar.findOne({
        department_id: friday.department_id,
        semester_id: friday.semester_id,
        friday_date: { $gt: friday.friday_date },
        status: 'open'
      }).sort({ friday_date: 1 });

      if (nextFriday) {
        // Carry requests to next Friday
        for (const request of pendingRequests) {
          request.friday_id = nextFriday._id;
          await request.save();
        }
      }
    }

    res.json({ 
      message: 'Friday blocked', 
      friday,
      affected_requests: pendingRequests.length 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT /api/leader/friday/:id/unblock
router.put('/friday/:id/unblock', async (req, res) => {
  try {
    const { reason } = req.body;
    const friday = await FridayCalendar.findById(req.params.id);
    if (!friday) return res.status(404).json({ message: 'Friday not found' });

    friday.status = 'open';
    friday.block_reason = null;
    friday.block_type = null;
    await friday.save();

    // Log the override
    await OverrideLog.create({
      friday_id: friday._id,
      department_id: friday.department_id,
      action: 'unblock_friday',
      reason: reason || 'Unblocked by leader',
      performed_by: req.user._id
    });

    res.json({ message: 'Friday unblocked', friday });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/leader/friday/list/:semesterId
router.get('/friday/list/:semesterId', async (req, res) => {
  try {
    const fridays = await FridayCalendar.find({ 
      semester_id: req.params.semesterId 
    }).sort({ friday_date: 1 });
    
    // Enrich with allocation counts
    const enriched = await Promise.all(fridays.map(async (f) => {
      const allocationCount = await LeaveAllocation.countDocuments({ 
        friday_id: f._id, released: false 
      });
      const requestCount = await LeaveRequest.countDocuments({ 
        friday_id: f._id, status: 'pending' 
      });
      return {
        ...f.toObject(),
        allocation_count: allocationCount,
        request_count: requestCount
      };
    }));

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ============ STUDENTS ============

// POST /api/leader/students/add
router.post('/students/add', async (req, res) => {
  try {
    const { name, roll_no, phone, password, notes } = req.body;
    const department_id = req.user.department_id;

    // Check if roll_no already exists
    const existing = await User.findOne({ roll_no });
    if (existing) {
      return res.status(400).json({ message: 'Roll number already exists' });
    }

    const student = await User.create({
      name,
      roll_no,
      phone,
      password: password || roll_no, // default password is roll_no
      role: 'student',
      department_id,
      notes
    });

    // Create profile for active semester
    const activeSemester = await Semester.findOne({ 
      department_id, is_active: true 
    });
    if (activeSemester) {
      await StudentProfile.create({
        user_id: student._id,
        department_id,
        semester_id: activeSemester._id
      });

      // Update semester student count
      const total = await User.countDocuments({ 
        department_id, role: 'student', is_active: true 
      });
      activeSemester.total_students = total;
      await activeSemester.save();
    }

    res.status(201).json({ 
      message: 'Student added', 
      student: { _id: student._id, name, roll_no, phone } 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/leader/students/bulk-import
router.post('/students/bulk-import', async (req, res) => {
  try {
    const { students } = req.body; // Array of { name, roll_no, phone, password }
    const department_id = req.user.department_id;

    const results = { success: 0, failed: 0, errors: [] };

    for (const s of students) {
      try {
        const existing = await User.findOne({ roll_no: s.roll_no });
        if (existing) {
          results.failed++;
          results.errors.push(`${s.roll_no}: Already exists`);
          continue;
        }

        const student = await User.create({
          name: s.name,
          roll_no: s.roll_no,
          phone: s.phone,
          password: s.password || s.roll_no,
          role: 'student',
          department_id
        });

        const activeSemester = await Semester.findOne({ department_id, is_active: true });
        if (activeSemester) {
          await StudentProfile.create({
            user_id: student._id,
            department_id,
            semester_id: activeSemester._id
          });
        }

        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push(`${s.roll_no}: ${err.message}`);
      }
    }

    // Update semester student count
    const activeSemester = await Semester.findOne({ department_id, is_active: true });
    if (activeSemester) {
      const total = await User.countDocuments({ department_id, role: 'student', is_active: true });
      activeSemester.total_students = total;
      await activeSemester.save();
    }

    res.json({ message: 'Bulk import complete', results });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT /api/leader/students/:id/toggle-active
router.put('/students/:id/toggle-active', async (req, res) => {
  try {
    const student = await User.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    student.is_active = !student.is_active;
    await student.save();

    res.json({ message: `Student ${student.is_active ? 'activated' : 'deactivated'}`, student });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/leader/students/list
router.get('/students/list', async (req, res) => {
  try {
    const department_id = req.user.department_id;
    const students = await User.find({ department_id, role: 'student' })
      .select('-password')
      .sort({ roll_no: 1 });

    const activeSemester = await Semester.findOne({ department_id, is_active: true });
    
    const enriched = await Promise.all(students.map(async (s) => {
      let profile = null;
      if (activeSemester) {
        profile = await StudentProfile.findOne({ 
          user_id: s._id, semester_id: activeSemester._id 
        });
      }
      return {
        ...s.toObject(),
        profile: profile ? profile.toObject() : null
      };
    }));

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT /api/leader/students/:id
router.put('/students/:id', async (req, res) => {
  try {
    const { name, phone, notes } = req.body;
    const student = await User.findByIdAndUpdate(
      req.params.id,
      { name, phone, notes },
      { new: true }
    ).select('-password');

    res.json(student);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ============ DASHBOARD ============

// GET /api/leader/dashboard/:semesterId
router.get('/dashboard/:semesterId', async (req, res) => {
  try {
    const department_id = req.user.department_id;
    const semesterId = req.params.semesterId;

    const semester = await Semester.findById(semesterId);
    if (!semester) return res.status(404).json({ message: 'Semester not found' });

    const totalStudents = await User.countDocuments({ 
      department_id, role: 'student', is_active: true 
    });

    // Find current/next Friday
    const now = new Date();
    const currentFriday = await FridayCalendar.findOne({
      semester_id: semesterId,
      friday_date: { $gte: now },
      status: { $in: ['open', 'locked'] }
    }).sort({ friday_date: 1 });

    let pendingRequests = 0;
    let allocations = [];
    if (currentFriday) {
      pendingRequests = await LeaveRequest.countDocuments({ 
        friday_id: currentFriday._id, status: 'pending' 
      });
      allocations = await LeaveAllocation.find({ 
        friday_id: currentFriday._id, released: false 
      }).populate('student_id', 'name roll_no phone');
    }

    // Get rotation risk count
    const profiles = await StudentProfile.find({ 
      department_id, semester_id: semesterId 
    });
    const totalLeaves = profiles.reduce((sum, p) => sum + p.total_leaves, 0);
    const avg = profiles.length > 0 ? totalLeaves / profiles.length : 0;
    const riskCount = profiles.filter(p => (avg - p.total_leaves) >= 2).length;

    // Get warnings
    const warnings = await generateWarnings(department_id, semesterId);

    const stats = await getCalendarStats(semesterId, totalStudents);

    res.json({
      totalStudents,
      currentFriday,
      pendingRequests,
      allocations,
      riskCount,
      warnings,
      stats,
      semester
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ============ OVERRIDE & ALLOCATION ============

// POST /api/leader/override
router.post('/override', async (req, res) => {
  try {
    const { friday_id, student_id, reason } = req.body;
    const department_id = req.user.department_id;

    // Create manual allocation
    const allocation = await LeaveAllocation.create({
      friday_id,
      department_id,
      student_id,
      allocation_type: 'manual',
      confirmed: false
    });

    // Log override
    await OverrideLog.create({
      friday_id,
      department_id,
      action: 'manual_add',
      target_student_id: student_id,
      reason,
      performed_by: req.user._id
    });

    // Notify student
    const friday = await FridayCalendar.findById(friday_id);
    await Notification.create({
      user_id: student_id,
      message: `You've been manually added to the leave list for ${friday.friday_date.toLocaleDateString()}`,
      type: 'approved'
    });

    res.json({ message: 'Override applied', allocation });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT /api/leader/allocation/:id/remove
router.put('/allocation/:id/remove', async (req, res) => {
  try {
    const { reason } = req.body;
    const allocation = await LeaveAllocation.findById(req.params.id);
    if (!allocation) return res.status(404).json({ message: 'Allocation not found' });

    // Log override
    await OverrideLog.create({
      friday_id: allocation.friday_id,
      department_id: allocation.department_id,
      action: 'manual_remove',
      target_student_id: allocation.student_id,
      reason,
      performed_by: req.user._id
    });

    // Remove allocation
    await LeaveAllocation.findByIdAndDelete(req.params.id);

    // Recalculate
    const result = await recalculateAfterRemoval(
      allocation.friday_id, allocation.student_id
    );

    res.json({ message: 'Student removed from allocation', result });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/leader/friday/:id/publish
router.post('/friday/:id/publish', async (req, res) => {
  try {
    const friday = await FridayCalendar.findById(req.params.id);
    if (!friday) return res.status(404).json({ message: 'Friday not found' });

    friday.status = 'published';
    await friday.save();

    // Notify all allocated students
    const allocations = await LeaveAllocation.find({ 
      friday_id: friday._id, released: false 
    });

    for (const alloc of allocations) {
      await Notification.create({
        user_id: alloc.student_id,
        message: `The leave list for ${friday.friday_date.toLocaleDateString()} has been published! Please confirm your attendance.`,
        type: 'published'
      });
    }

    res.json({ message: 'Friday list published', friday });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/leader/whatsapp-export/:fridayId
router.get('/whatsapp-export/:fridayId', async (req, res) => {
  try {
    const friday = await FridayCalendar.findById(req.params.fridayId);
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

    let text = `✅ *Quota Manager — ${dateStr}*\n`;
    text += `Approved Students (${allocations.length}/${totalStudents}):\n\n`;

    allocations.forEach((a, i) => {
      const student = a.student_id;
      text += `${i + 1}. ${student.name} — ${student.roll_no}\n`;
    });

    text += `\n_Generated by Quota Manager_`;

    res.json({ text, allocations_count: allocations.length });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ============ RUN ROTATION ENGINE ============

// POST /api/leader/rotation/run/:fridayId
router.post('/rotation/run/:fridayId', async (req, res) => {
  try {
    const result = await runRotationEngine(req.params.fridayId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
