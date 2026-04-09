const StudentProfile = require('../models/StudentProfile');
const LeaveRequest = require('../models/LeaveRequest');
const LeaveAllocation = require('../models/LeaveAllocation');
const FridayCalendar = require('../models/FridayCalendar');
const Notification = require('../models/Notification');
const User = require('../models/User');

const MAX_YEARLY_QUOTA = 15; // Hidden threshold

const runRotationEngine = async (fridayId) => {
  const friday = await FridayCalendar.findById(fridayId);
  if (!friday) throw new Error('Friday not found');

  const { department_id, semester_id, total_slots } = friday;

  const profiles = await StudentProfile.find({ department_id, semester_id }).populate('user_id');
  const activeProfiles = profiles.filter(p => p.user_id && p.user_id.is_active);

  if (activeProfiles.length === 0) {
    return { allocated: [], all_scores: [] };
  }

  // Filter out exhausted quota students
  const eligibleProfiles = activeProfiles.filter(p => p.total_leaves < MAX_YEARLY_QUOTA);

  const now = new Date();

  // Rule 1: Never had quota gets absolute first priority
  // Rule 2: Least quota used
  // Rule 3: Longest wait since last quota
  const scoredStudents = eligibleProfiles.map(profile => {
    let wait_time = 0;
    const never_had = !profile.last_leave_date;

    if (!never_had) {
      wait_time = now.getTime() - new Date(profile.last_leave_date).getTime();
    } else {
      wait_time = Infinity;
    }

    return {
      student_id: profile.user_id._id,
      user: profile.user_id,
      profile,
      metrics: {
        never_had,
        quota_used: profile.total_leaves,
        wait_time
      }
    };
  });

  scoredStudents.sort((a, b) => {
    if (a.metrics.never_had && !b.metrics.never_had) return -1;
    if (!a.metrics.never_had && b.metrics.never_had) return 1;

    if (a.metrics.quota_used !== b.metrics.quota_used) {
      return a.metrics.quota_used - b.metrics.quota_used;
    }

    return b.metrics.wait_time - a.metrics.wait_time;
  });

  return {
    previewList: scoredStudents.map(s => ({
      student_id: s.student_id,
      name: s.user.name,
      roll_no: s.user.roll_no,
      metrics: s.metrics
    }))
  };
};

const publishList = async (fridayId) => {
  const friday = await FridayCalendar.findById(fridayId);
  if (!friday) throw new Error('Friday not found');

  const result = await runRotationEngine(fridayId);
  const scoredStudents = result.previewList;

  const selected = scoredStudents.slice(0, friday.total_slots);
  
  await LeaveAllocation.deleteMany({ friday_id: fridayId }); // clear existing auto allocations

  const allocations = [];
  for (const student of selected) {
    const allocation = await LeaveAllocation.create({
      friday_id: fridayId,
      department_id: friday.department_id,
      student_id: student.student_id,
      allocation_type: 'auto',
      status: 'allocated'
    });
    allocations.push(allocation);

    await Notification.create({
      user_id: student.student_id,
      message: `You've been allocated a quota spot for this week! Please check the app.`,
      type: 'info'
    });

    // Update their profile priority visually if needed
    await StudentProfile.findOneAndUpdate(
      { user_id: student.student_id, semester_id: friday.semester_id },
      { $inc: { rotation_priority: 1 } }
    );
  }

  return { message: "List published successfully", allocations };
};

const recalculateAfterRemoval = async (fridayId, studentId) => {
  const allocation = await LeaveAllocation.findOne({ friday_id: fridayId, student_id: studentId });
  if (allocation) {
    allocation.status = 'spot_available';
    await allocation.save();
  }
  return { message: 'Spot marked as available for swap' };
};

const generateRotationReport = async (semesterId) => {
  const profiles = await StudentProfile.find({ semester_id: semesterId })
    .populate('user_id', 'name roll_no');

  if (profiles.length === 0) return { students: [], average: 0 };

  const totalLeaves = profiles.reduce((sum, p) => sum + p.total_leaves, 0);
  const average = totalLeaves / profiles.length;

  const students = profiles.map(p => {
    return {
      student_id: p.user_id?._id,
      name: p.user_id?.name,
      roll_no: p.user_id?.roll_no,
      total_leaves: p.total_leaves,
      swap_count: p.swap_count,
      priority: p.rotation_priority
    };
  });

  return { students, average: Math.round(average * 100) / 100 };
};

const predictConfidence = async (studentId, fridayId) => {
  const result = await runRotationEngine(fridayId);
  const position = result.previewList.findIndex(s => s.student_id.toString() === studentId.toString()) + 1;
  const friday = await FridayCalendar.findById(fridayId);
  const totalSlots = friday ? friday.total_slots : 0;

  let confidence = 'low';
  if (position > 0 && position <= totalSlots * 0.5) confidence = 'high';
  else if (position > 0 && position <= totalSlots) confidence = 'medium';

  return {
    confidence,
    position: position > 0 ? position : null,
    total_slots: totalSlots,
    explanation: `You are roughly #${position} in the rotation queue.`
  };
};

const requestSwap = async (allocationId, requesterId) => {
  const allocation = await LeaveAllocation.findById(allocationId);
  if(!allocation) throw new Error("Allocation not found");
  if(allocation.status !== 'spot_available') throw new Error("This spot is not available for swapping");

  if (!allocation.swap_requests.includes(requesterId)) {
    allocation.swap_requests.push(requesterId);
    await allocation.save();

    const requester = await User.findById(requesterId);
    
    await Notification.create({
      user_id: allocation.student_id,
      message: `${requester.name} requested to swap your available quota spot!`,
      type: 'info'
    });
  }
  return allocation;
};

const acceptSwap = async (allocationId, userId, requesterId) => {
  const allocation = await LeaveAllocation.findById(allocationId);
  if(!allocation) throw new Error("Allocation not found");
  if(allocation.student_id.toString() !== userId.toString()) throw new Error("Unauthorized to accept this swap");
  
  // Accept logic: Auto-approve
  allocation.status = 'swapped';
  await allocation.save();

  await LeaveAllocation.create({
    friday_id: allocation.friday_id,
    department_id: allocation.department_id,
    student_id: requesterId,
    allocation_type: 'swap',
    status: 'allocated' // Gives the requester the confirmed spot
  });

  // Increment total leaves & swap counts
  await StudentProfile.findOneAndUpdate(
    { user_id: requesterId },
    { $inc: { total_leaves: 1, swap_count: 1 } }
  );

  return { message: "Swap automatically approved!" };
};

module.exports = {
  runRotationEngine,
  publishList,
  recalculateAfterRemoval,
  generateRotationReport,
  predictConfidence,
  requestSwap,
  acceptSwap
};
