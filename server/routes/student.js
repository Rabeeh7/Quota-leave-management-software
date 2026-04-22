const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');
const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const Semester = require('../models/Semester');
const FridayCalendar = require('../models/FridayCalendar');
const LeaveRequest = require('../models/LeaveRequest');
const LeaveAllocation = require('../models/LeaveAllocation');
const Notification = require('../models/Notification');
const { predictConfidence, getNextQuotaDate } = require('../services/fairnessEngine');
const { getWindowDates } = require('../utils/helpers');

router.use(auth, roleGuard('student'));

// GET /api/student/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const user = req.user;
    const department_id = user.department_id;

    const activeSemester = await Semester.findOne({ is_active: true });
    if (!activeSemester) {
      return res.json({ message: 'No active semester', data: null });
    }

    const profile = await StudentProfile.findOne({ 
      user_id: user._id, semester_id: activeSemester._id 
    });

    // Get class stats
    const allProfiles = await StudentProfile.find({ 
      department_id, semester_id: activeSemester._id 
    });
    const totalLeaves = allProfiles.reduce((sum, p) => sum + p.total_leaves, 0);
    const classAverage = allProfiles.length > 0 ? totalLeaves / allProfiles.length : 0;

    // Rotation badge
    let rotationBadge = 'Equal';
    let myLeaves = profile ? profile.total_leaves : 0;
    if (myLeaves < classAverage - 1) rotationBadge = 'Behind';
    else if (myLeaves > classAverage + 1) rotationBadge = 'Ahead';

    // Next friday
    const now = new Date();
    const nextFriday = await FridayCalendar.findOne({
      semester_id: activeSemester._id,
      friday_date: { $gte: now },
      status: { $in: ['open', 'locked', 'published'] }
    }).sort({ friday_date: 1 });

    // Check if student is allocated this friday
    let isAllocated = false;
    let allocation = null;
    let myRequest = null;
    if (nextFriday) {
      allocation = await LeaveAllocation.findOne({ 
        friday_id: nextFriday._id, student_id: user._id, status: { $in: ['allocated', 'confirmed', 'spot_available'] }
      });
      
      // Populate swap_request_details with user info
      if (allocation && allocation.swap_request_details && allocation.swap_request_details.length > 0) {
        const populatedDetails = [];
        for (const detail of allocation.swap_request_details) {
          const requesterUser = await User.findById(detail.requester_id).select('name roll_no phone');
          populatedDetails.push({
            _id: detail._id,
            requester_id: detail.requester_id,
            requester_name: requesterUser?.name,
            requester_roll_no: requesterUser?.roll_no,
            requester_phone: requesterUser?.phone,
            requester_next_date: detail.requester_next_date,
            status: detail.status,
            created_at: detail.created_at
          });
        }
        allocation = allocation.toObject();
        allocation.swap_request_details = populatedDetails;
      } else if (allocation) {
        // Also populate legacy swap_requests
        allocation = await LeaveAllocation.findOne({ 
          friday_id: nextFriday._id, student_id: user._id, status: { $in: ['allocated', 'confirmed', 'spot_available'] }
        }).populate('swap_requests', 'name phone roll_no');
      }
      
      isAllocated = !!allocation;

      myRequest = await LeaveRequest.findOne({ 
        friday_id: nextFriday._id, student_id: user._id 
      });
    }

    // Queue prediction
    let prediction = null;
    if (nextFriday && !isAllocated) {
      prediction = await predictConfidence(user._id, nextFriday._id);
    }

    let windowState = null;
    if (nextFriday) {
      const Department = require('../models/Department');
      const dept = await Department.findById(department_id);
      
      const config = {
        request_open_day: dept?.request_open_day || activeSemester.request_open_day,
        request_open_time: dept?.request_open_time || activeSemester.request_open_time,
        request_deadline_day: dept?.request_deadline_day || activeSemester.request_deadline_day,
        request_deadline_time: dept?.request_deadline_time || activeSemester.request_deadline_time
      };

      const { openDate, deadlineDate } = getWindowDates(nextFriday.friday_date, config);
      const _now = new Date();
      windowState = {
        open_date: openDate,
        deadline_date: deadlineDate,
        is_open: _now >= openDate && _now <= deadlineDate && nextFriday.status === 'open'
      };
    }

    // Get predicted next quota date
    let nextQuotaDate = null;
    if (isAllocated && nextFriday) {
      nextQuotaDate = nextFriday.friday_date;
    } else {
      nextQuotaDate = await getNextQuotaDate(user._id, department_id);
    }

    // Recent notifications
    const notifications = await Notification.find({ user_id: user._id })
      .sort({ created_at: -1 })
      .limit(5);

    // Semester progress
    const semesterStart = new Date(activeSemester.start_date);
    const semesterEnd = new Date(activeSemester.end_date);
    const totalDays = (semesterEnd - semesterStart) / (1000 * 60 * 60 * 24);
    const elapsedDays = (now - semesterStart) / (1000 * 60 * 60 * 24);
    const progress = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));

    res.json({
      semester: activeSemester,
      profile,
      classAverage: Math.round(classAverage * 100) / 100,
      rotationBadge,
      nextFriday,
      isAllocated,
      allocation,
      myRequest,
      prediction,
      nextQuotaDate,
      notifications,
      progress,
      windowState
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/student/request
router.post('/request', async (req, res) => {
  try {
    const { friday_id, request_type, reason, swap_with_student_id } = req.body;
    const user = req.user;

    const friday = await FridayCalendar.findById(friday_id);
    if (!friday) return res.status(404).json({ message: 'Friday not found' });

    const activeSemester = await Semester.findById(friday.semester_id);

    if (friday.stage !== 'request_open') {
      return res.status(400).json({ message: 'Request window is not currently open' });
    }

    if (!reason || reason.trim() === '') {
      return res.status(400).json({ message: 'Reason is required for leave requests' });
    }

    // Check for existing request
    const existing = await LeaveRequest.findOne({ 
      friday_id, student_id: user._id, status: { $in: ['pending', 'approved'] } 
    });
    if (existing) {
      return res.status(400).json({ message: 'You already have a request for this Friday' });
    }

    // Check emergency limit
    if (request_type === 'emergency') {
      const semester = await Semester.findById(friday.semester_id);
      const profile = await StudentProfile.findOne({ 
        user_id: user._id, semester_id: semester._id 
      });
      
      const Department = require('../models/Department');
      const dept = await Department.findById(user.department_id);
      const limit = dept?.emergency_limit || semester.emergency_limit;

      if (profile && profile.emergency_count >= limit) {
        return res.status(400).json({ 
          message: `Emergency limit reached (${limit} per semester)` 
        });
      }
    }

    const leaveRequest = await LeaveRequest.create({
      student_id: user._id,
      department_id: user.department_id,
      friday_id,
      request_type: request_type || 'normal',
      reason,
      submitted_at: new Date(),
      swap_with_student_id
    });

    res.status(201).json({ message: 'Request submitted', request: leaveRequest });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT /api/student/request/:id/cancel
router.put('/request/:id/cancel', async (req, res) => {
  try {
    const request = await LeaveRequest.findOne({ 
      _id: req.params.id, student_id: req.user._id 
    });
    if (!request) return res.status(404).json({ message: 'Request not found' });

    if (request.status !== 'pending') {
      return res.status(400).json({ message: 'Can only cancel pending requests' });
    }

    request.status = 'denied';
    await request.save();

    res.json({ message: 'Request cancelled' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT /api/student/allocation/:id/confirm
router.put('/allocation/:id/confirm', async (req, res) => {
  try {
    const allocation = await LeaveAllocation.findOne({ 
      _id: req.params.id, student_id: req.user._id 
    });
    if (!allocation) return res.status(404).json({ message: 'Allocation not found' });

    allocation.status = 'confirmed';
    await allocation.save();

    // Update profile last_leave_date
    const friday = await FridayCalendar.findById(allocation.friday_id);
    if (friday) {
      await StudentProfile.findOneAndUpdate(
        { user_id: req.user._id, semester_id: friday.semester_id },
        { last_leave_date: friday.friday_date, $inc: { total_leaves: 1 } }
      );
    }

    res.json({ message: 'Quota confirmed', allocation });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT /api/student/allocation/:id/release
router.put('/allocation/:id/release', async (req, res) => {
  try {
    const allocation = await LeaveAllocation.findOne({ 
      _id: req.params.id, student_id: req.user._id 
    });
    if (!allocation) return res.status(404).json({ message: 'Allocation not found' });

    allocation.status = 'spot_available';
    await allocation.save();

    // Update the request status
    const request = await LeaveRequest.findOne({ 
      friday_id: allocation.friday_id, student_id: req.user._id 
    });
    if (request) {
      request.status = 'released';
      await request.save();
    }

    // Notify leader about released slot
    const leader = await User.findOne({ 
      department_id: allocation.department_id, role: 'leader' 
    });
    if (leader) {
      await Notification.create({
        user_id: leader._id,
        message: `${req.user.name} rejected their quota slot. It's now available for swapping!`,
        type: 'info'
      });
    }

    res.json({ message: 'Spot marked as available', allocation });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/student/next-date
router.get('/next-date', async (req, res) => {
  try {
    const nextDate = await getNextQuotaDate(req.user._id, req.user.department_id);
    res.json({ nextQuotaDate: nextDate });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/student/history
router.get('/history', async (req, res) => {
  try {
    const { filter } = req.query; // 'month', 'semester', 'all'
    const user = req.user;

    let query = { student_id: user._id };

    if (filter === 'month') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      query.created_at = { $gte: monthAgo };
    }

    const requests = await LeaveRequest.find(query)
      .populate('friday_id', 'friday_date status')
      .sort({ created_at: -1 });

    // Summary
    const approved = requests.filter(r => r.status === 'approved').length;
    const denied = requests.filter(r => r.status === 'denied').length;
    const swaps = requests.filter(r => r.request_type === 'swap').length;
    const emergencies = requests.filter(r => r.request_type === 'emergency').length;

    res.json({
      requests,
      summary: { total: requests.length, approved, denied, swaps, emergencies }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/student/notifications
router.get('/notifications', async (req, res) => {
  try {
    const notifications = await Notification.find({ user_id: req.user._id })
      .sort({ created_at: -1 })
      .limit(50);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT /api/student/notifications/read-all
router.put('/notifications/read-all', async (req, res) => {
  try {
    await Notification.updateMany(
      { user_id: req.user._id, read: false },
      { read: true }
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/student/leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const user = req.user;
    
    const activeSemester = await Semester.findOne({ is_active: true });
    if (!activeSemester) return res.json({ message: 'No active semester', students: [] });

    // Fetch all active students in the semester
    const profiles = await StudentProfile.find({ semester_id: activeSemester._id })
      .populate('user_id', 'name roll_no is_active phone');
      
    // Next friday
    const now = new Date();
    const nextFriday = await FridayCalendar.findOne({
      semester_id: activeSemester._id,
      friday_date: { $gte: now },
      status: { $in: ['published', 'locked', 'open'] }
    }).sort({ friday_date: 1 });

    let allocations = [];
    if (nextFriday) {
      allocations = await LeaveAllocation.find({ friday_id: nextFriday._id });
    }

    const students = profiles
      .filter(p => p.user_id && p.user_id.is_active)
      .map(p => {
        let status = 'none'; // Not this week
        let allocationId = null;

        if (nextFriday) {
          const alloc = allocations.find(a => a.student_id.toString() === p.user_id._id.toString());
          if (alloc) {
            status = alloc.status === 'spot_available' ? 'available' : 'allocated';
            allocationId = alloc._id;
          }
        }

        return {
          _id: p.user_id._id,
          name: p.user_id.name,
          roll_no: p.user_id.roll_no,
          phone: p.user_id.phone,
          status,
          allocation_id: allocationId,
          quota_used: p.total_leaves
        };
      });

    // Sort: allocated first, available next, none last. Then by quota_used
    students.sort((a, b) => {
      const order = { 'available': 1, 'allocated': 2, 'none': 3 };
      if (order[a.status] !== order[b.status]) {
        return order[a.status] - order[b.status];
      }
      return a.quota_used - b.quota_used;
    });

    res.json({
      friday: nextFriday ? { _id: nextFriday._id, date: nextFriday.friday_date } : null,
      students
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/student/current-stage
router.get('/current-stage', async (req, res) => {
  try {
    const user = req.user;
    const activeSemester = await Semester.findOne({ is_active: true });
    if (!activeSemester) return res.json({ stage: 'unavailable' });

    const now = new Date();
    const nextFriday = await FridayCalendar.findOne({
      semester_id: activeSemester._id,
      friday_date: { $gte: now },
      status: { $ne: 'passed' }
    }).sort({ friday_date: 1 });

    if (!nextFriday) return res.json({ stage: 'unavailable' });

    // Auto-update stage based on time
    if (nextFriday.stage === 'upcoming' || !nextFriday.stage || nextFriday.stage === 'request_open' || nextFriday.stage === 'request_closed') {
      if (nextFriday.request_window_open && now >= nextFriday.request_window_open && now < nextFriday.request_window_close) {
        nextFriday.stage = 'request_open';
        await nextFriday.save();
      } else if (nextFriday.request_window_close && now >= nextFriday.request_window_close && (!nextFriday.stage || nextFriday.stage === 'request_open' || nextFriday.stage === 'upcoming')) {
        nextFriday.stage = 'request_closed';
        await nextFriday.save();
      }
    }

    res.json({ 
        friday_id: nextFriday._id,
        stage: nextFriday.stage, 
        request_open: nextFriday.request_window_open, 
        request_close: nextFriday.request_window_close,
        swap_close: nextFriday.swap_window_close 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
