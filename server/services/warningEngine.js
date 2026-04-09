const StudentProfile = require('../models/StudentProfile');
const Notification = require('../models/Notification');

/**
 * Smart Warnings Engine
 * Runs after each rotation calculation to flag issues
 * Returns warnings array for the leader dashboard
 */
const generateWarnings = async (departmentId, semesterId) => {
  const profiles = await StudentProfile.find({
    department_id: departmentId,
    semester_id: semesterId
  }).populate('user_id', 'name roll_no');

  const activeProfiles = profiles.filter(p => p.user_id && p.user_id.is_active);
  
  if (activeProfiles.length === 0) return [];

  const warnings = [];

  // Calculate class average
  const totalLeaves = activeProfiles.reduce((sum, p) => sum + p.total_leaves, 0);
  const classAverage = totalLeaves / activeProfiles.length;

  // 1. Flag students 2+ leaves behind average
  const behindStudents = activeProfiles.filter(p => 
    (classAverage - p.total_leaves) >= 2
  );
  for (const student of behindStudents) {
    const diff = Math.round((classAverage - student.total_leaves) * 10) / 10;
    warnings.push({
      type: 'behind_average',
      severity: 'warning',
      student_id: student.user_id._id,
      name: student.user_id.name,
      roll_no: student.user_id.roll_no,
      message: `${student.user_id.name} is ${diff} leaves behind average`,
      icon: '⚠️'
    });
  }

  // 2. Flag students with 2+ emergency overrides
  const emergencyAbusers = activeProfiles.filter(p => p.emergency_count >= 2);
  for (const student of emergencyAbusers) {
    warnings.push({
      type: 'emergency_abuse',
      severity: 'danger',
      student_id: student.user_id._id,
      name: student.user_id.name,
      roll_no: student.user_id.roll_no,
      message: `${student.user_id.name} has used ${student.emergency_count} emergency overrides`,
      icon: '🚨'
    });
  }

  // 3. Flag 3 longest waiting students
  const sortedByWait = [...activeProfiles]
    .filter(p => p.last_leave_date)
    .sort((a, b) => new Date(a.last_leave_date) - new Date(b.last_leave_date));

  const longestWaiting = sortedByWait.slice(0, 3);
  for (const student of longestWaiting) {
    const daysSince = Math.floor(
      (new Date() - new Date(student.last_leave_date)) / (1000 * 60 * 60 * 24)
    );
    if (daysSince > 14) {
      warnings.push({
        type: 'long_wait',
        severity: 'info',
        student_id: student.user_id._id,
        name: student.user_id.name,
        roll_no: student.user_id.roll_no,
        message: `${student.user_id.name} hasn't had leave in ${daysSince} days`,
        icon: '⏰'
      });
    }
  }

  // Also flag students who never got leave
  const neverGotLeave = activeProfiles.filter(p => !p.last_leave_date && p.total_leaves === 0);
  for (const student of neverGotLeave) {
    warnings.push({
      type: 'never_got_leave',
      severity: 'warning',
      student_id: student.user_id._id,
      name: student.user_id.name,
      roll_no: student.user_id.roll_no,
      message: `${student.user_id.name} has never received quota leave`,
      icon: '🆕'
    });
  }

  return warnings;
};

module.exports = { generateWarnings };
