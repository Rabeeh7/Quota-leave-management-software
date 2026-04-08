const StudentProfile = require('../models/StudentProfile');
const LeaveRequest = require('../models/LeaveRequest');
const LeaveAllocation = require('../models/LeaveAllocation');
const FridayCalendar = require('../models/FridayCalendar');
const Notification = require('../models/Notification');
const User = require('../models/User');

/**
 * Run the fairness engine for a specific Friday
 * Algorithm:
 *   base_score = class_average_leaves - student.total_leaves
 *   wait_bonus = days_since_last_leave / 7
 *   request_bonus = +2 if student submitted request this week
 *   emergency_bonus = +999 if emergency request
 *   debt_penalty = -fairness_debt
 *   final_score = base_score + wait_bonus + request_bonus + emergency_bonus - debt_penalty
 */
const runFairnessEngine = async (fridayId) => {
  const friday = await FridayCalendar.findById(fridayId);
  if (!friday) throw new Error('Friday not found');

  const { department_id, semester_id, total_slots } = friday;

  // Get all active students in this department/semester
  const profiles = await StudentProfile.find({
    department_id,
    semester_id
  }).populate('user_id');

  const activeProfiles = profiles.filter(p => p.user_id && p.user_id.is_active);

  if (activeProfiles.length === 0) {
    return { allocated: [], scores: [] };
  }

  // Calculate class average leaves
  const totalLeavesAll = activeProfiles.reduce((sum, p) => sum + p.total_leaves, 0);
  const classAverage = totalLeavesAll / activeProfiles.length;

  // Get requests for this Friday
  const requests = await LeaveRequest.find({
    friday_id: fridayId,
    status: 'pending'
  });

  const requestMap = {};
  requests.forEach(r => {
    requestMap[r.student_id.toString()] = r;
  });

  // Get existing allocations to check for fairness debt
  const existingAllocations = await LeaveAllocation.find({
    department_id,
    student_id: { $in: activeProfiles.map(p => p.user_id._id) }
  });

  const debtMap = {};
  existingAllocations.forEach(a => {
    const key = a.student_id.toString();
    if (!debtMap[key]) debtMap[key] = 0;
    debtMap[key] += a.fairness_debt || 0;
  });

  // Calculate scores for each student
  const now = new Date();
  const scoredStudents = activeProfiles.map(profile => {
    const studentId = profile.user_id._id.toString();
    const request = requestMap[studentId];

    // Base score: how far behind the student is
    const base_score = classAverage - profile.total_leaves;

    // Wait bonus: days since last leave / 7
    let wait_bonus = 0;
    if (profile.last_leave_date) {
      const daysSinceLast = Math.floor(
        (now - new Date(profile.last_leave_date)) / (1000 * 60 * 60 * 24)
      );
      wait_bonus = daysSinceLast / 7;
    } else {
      // Never had leave — maximum wait bonus
      wait_bonus = 10;
    }

    // Request bonus: +2 if student submitted a request
    const request_bonus = request ? 2 : 0;

    // Emergency bonus: +999 if emergency request
    const emergency_bonus = request && request.request_type === 'emergency' ? 999 : 0;

    // Debt penalty
    const debt_penalty = debtMap[studentId] || 0;

    const final_score = base_score + wait_bonus + request_bonus + emergency_bonus - debt_penalty;

    return {
      student_id: profile.user_id._id,
      user: profile.user_id,
      profile,
      request,
      scores: {
        base_score: Math.round(base_score * 100) / 100,
        wait_bonus: Math.round(wait_bonus * 100) / 100,
        request_bonus,
        emergency_bonus,
        debt_penalty,
        final_score: Math.round(final_score * 100) / 100
      }
    };
  });

  // Sort by final_score descending
  scoredStudents.sort((a, b) => b.scores.final_score - a.scores.final_score);

  // Select top N students
  const selected = scoredStudents.slice(0, total_slots);
  const notSelected = scoredStudents.slice(total_slots);

  // Clear existing allocations for this Friday
  await LeaveAllocation.deleteMany({ friday_id: fridayId });

  // Create allocations for selected students
  const allocations = [];
  for (const student of selected) {
    const allocationType = student.request && student.request.request_type === 'emergency'
      ? 'emergency'
      : student.request && student.request.request_type === 'swap'
        ? 'swap'
        : student.request
          ? 'auto'
          : 'auto';

    const allocation = await LeaveAllocation.create({
      friday_id: fridayId,
      department_id,
      student_id: student.student_id,
      allocation_type: allocationType,
      confirmed: false,
      released: false
    });

    allocations.push(allocation);

    // Update request status if exists
    if (student.request) {
      await LeaveRequest.findByIdAndUpdate(student.request._id, { status: 'approved' });
    }

    // Create notification for approved student
    await Notification.create({
      user_id: student.student_id,
      message: `You've been allocated quota leave for ${friday.friday_date.toLocaleDateString()}! Please confirm.`,
      type: 'approved'
    });
  }

  // Deny remaining requests
  for (const student of notSelected) {
    if (student.request) {
      await LeaveRequest.findByIdAndUpdate(student.request._id, { status: 'denied' });
      await Notification.create({
        user_id: student.student_id,
        message: `Your leave request for ${friday.friday_date.toLocaleDateString()} was not selected this time.`,
        type: 'denied'
      });
    }
  }

  // Update fairness scores for all students
  for (const student of scoredStudents) {
    await StudentProfile.findByIdAndUpdate(student.profile._id, {
      fairness_score: student.scores.final_score
    });
  }

  return {
    allocated: selected.map(s => ({
      student_id: s.student_id,
      name: s.user.name,
      roll_no: s.user.roll_no,
      score: s.scores.final_score,
      type: s.request?.request_type || 'auto',
      scores: s.scores
    })),
    all_scores: scoredStudents.map(s => ({
      student_id: s.student_id,
      name: s.user.name,
      roll_no: s.user.roll_no,
      score: s.scores.final_score,
      selected: selected.includes(s),
      scores: s.scores
    }))
  };
};

/**
 * Recalculate after removing a student from Friday allocation
 */
const recalculateAfterRemoval = async (fridayId, studentId) => {
  // Remove the student's allocation
  await LeaveAllocation.findOneAndDelete({
    friday_id: fridayId,
    student_id: studentId
  });

  // Get current allocations count
  const currentAllocations = await LeaveAllocation.find({ friday_id: fridayId, released: false });
  const friday = await FridayCalendar.findById(fridayId);

  if (currentAllocations.length < friday.total_slots) {
    // Find next eligible student
    const result = await runFairnessEngine(fridayId);
    return result;
  }

  return { message: 'Student removed, no replacement needed' };
};

/**
 * Generate fairness report for a semester
 */
const generateFairnessReport = async (semesterId) => {
  const profiles = await StudentProfile.find({ semester_id: semesterId })
    .populate('user_id', 'name roll_no');

  if (profiles.length === 0) return { students: [], average: 0 };

  const totalLeaves = profiles.reduce((sum, p) => sum + p.total_leaves, 0);
  const average = totalLeaves / profiles.length;

  const students = profiles.map(p => {
    const difference = p.total_leaves - average;
    let risk_level = 'equal';
    if (difference < -1) risk_level = 'behind';
    else if (difference > 1) risk_level = 'ahead';

    return {
      student_id: p.user_id?._id,
      name: p.user_id?.name,
      roll_no: p.user_id?.roll_no,
      total_leaves: p.total_leaves,
      vs_average: Math.round(difference * 100) / 100,
      risk_level,
      emergency_count: p.emergency_count,
      swap_count: p.swap_count,
      fairness_score: p.fairness_score
    };
  });

  return { students, average: Math.round(average * 100) / 100 };
};

/**
 * Predict confidence for a student getting a specific Friday
 */
const predictConfidence = async (studentId, fridayId) => {
  const friday = await FridayCalendar.findById(fridayId);
  if (!friday) return { confidence: 'low', position: null, total_slots: null };

  const profile = await StudentProfile.findOne({ 
    user_id: studentId, 
    semester_id: friday.semester_id 
  });
  if (!profile) return { confidence: 'low', position: null, total_slots: null };

  const allProfiles = await StudentProfile.find({
    department_id: friday.department_id,
    semester_id: friday.semester_id
  }).populate('user_id');

  const activeProfiles = allProfiles.filter(p => p.user_id && p.user_id.is_active);
  const totalLeaves = activeProfiles.reduce((sum, p) => sum + p.total_leaves, 0);
  const classAverage = activeProfiles.length > 0 ? totalLeaves / activeProfiles.length : 0;

  // Simple score calculation for prediction
  const now = new Date();
  const scored = activeProfiles.map(p => {
    const base = classAverage - p.total_leaves;
    let wait = 0;
    if (p.last_leave_date) {
      wait = Math.floor((now - new Date(p.last_leave_date)) / (1000 * 60 * 60 * 24)) / 7;
    } else {
      wait = 10;
    }
    return {
      student_id: p.user_id._id.toString(),
      score: base + wait
    };
  });

  scored.sort((a, b) => b.score - a.score);

  const position = scored.findIndex(s => s.student_id === studentId.toString()) + 1;
  const totalSlots = friday.total_slots;

  let confidence = 'low';
  if (position <= totalSlots * 0.5) confidence = 'high';
  else if (position <= totalSlots) confidence = 'medium';

  return {
    confidence,
    position,
    total_slots: totalSlots,
    total_students: activeProfiles.length,
    explanation: confidence === 'high'
      ? `You're #${position} in queue with ${totalSlots} slots available. Very likely!`
      : confidence === 'medium'
        ? `You're #${position} in queue with ${totalSlots} slots. Possible but not guaranteed.`
        : `You're #${position} in queue with only ${totalSlots} slots. Unlikely this week.`
  };
};

module.exports = {
  runFairnessEngine,
  recalculateAfterRemoval,
  generateFairnessReport,
  predictConfidence
};
