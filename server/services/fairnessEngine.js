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

    // Update their profile priority
    await StudentProfile.findOneAndUpdate(
      { user_id: student.student_id, semester_id: friday.semester_id },
      { $inc: { rotation_priority: 1 } }
    );
  }

  // Mark friday as published
  friday.status = 'published';
  await friday.save();

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

/**
 * Predict the next quota date for a student based on their queue position
 */
const getNextQuotaDate = async (studentId, departmentId) => {
  try {
    const user = await User.findById(studentId);
    if (!user) return null;

    const now = new Date();
    
    // Find upcoming open/published fridays
    const upcomingFridays = await FridayCalendar.find({
      department_id: departmentId,
      friday_date: { $gte: now },
      status: { $in: ['open', 'locked', 'published'] }
    }).sort({ friday_date: 1 });

    if (upcomingFridays.length === 0) return null;

    // Check each upcoming friday for this student's position
    for (const friday of upcomingFridays) {
      // Check if already allocated
      const existingAlloc = await LeaveAllocation.findOne({
        friday_id: friday._id,
        student_id: studentId,
        status: { $in: ['allocated', 'confirmed'] }
      });
      if (existingAlloc) return friday.friday_date;

      // Run rotation preview to see if student would be in the list
      const result = await runRotationEngine(friday._id);
      const position = result.previewList.findIndex(
        s => s.student_id.toString() === studentId.toString()
      ) + 1;

      if (position > 0 && position <= friday.total_slots) {
        return friday.friday_date;
      }
    }

    // If not found in any upcoming, estimate based on position
    if (upcomingFridays.length > 0) {
      const firstFriday = upcomingFridays[0];
      const result = await runRotationEngine(firstFriday._id);
      const position = result.previewList.findIndex(
        s => s.student_id.toString() === studentId.toString()
      ) + 1;
      
      if (position > 0) {
        const weeksAway = Math.ceil(position / firstFriday.total_slots);
        const estimatedDate = new Date(firstFriday.friday_date);
        estimatedDate.setDate(estimatedDate.getDate() + (weeksAway - 1) * 7);
        return estimatedDate;
      }
    }

    return null;
  } catch (err) {
    console.error('getNextQuotaDate error:', err);
    return null;
  }
};

const requestSwap = async (allocationId, requesterId) => {
  const allocation = await LeaveAllocation.findById(allocationId);
  if(!allocation) throw new Error("Allocation not found");
  if(allocation.status !== 'spot_available') throw new Error("This spot is not available for swapping");

  // Don't allow self-swap
  if (allocation.student_id.toString() === requesterId.toString()) {
    throw new Error("You cannot swap with yourself");
  }

  // Check if already requested
  const alreadyRequested = allocation.swap_request_details.find(
    d => d.requester_id.toString() === requesterId.toString()
  );
  if (alreadyRequested) throw new Error("You have already requested this swap");

  // Get requester's predicted next date
  const requester = await User.findById(requesterId);
  const requesterNextDate = await getNextQuotaDate(requesterId, allocation.department_id);

  // Add to legacy array
  if (!allocation.swap_requests.includes(requesterId)) {
    allocation.swap_requests.push(requesterId);
  }

  // Add to detailed array
  allocation.swap_request_details.push({
    requester_id: requesterId,
    requester_next_date: requesterNextDate,
    status: 'pending'
  });

  await allocation.save();

  await Notification.create({
    user_id: allocation.student_id,
    message: `${requester.name} requested to swap your available quota spot!`,
    type: 'swap'
  });

  return allocation;
};

const acceptSwap = async (allocationId, userId, requesterId) => {
  const allocation = await LeaveAllocation.findById(allocationId);
  if(!allocation) throw new Error("Allocation not found");
  if(allocation.student_id.toString() !== userId.toString()) throw new Error("Unauthorized to accept this swap");
  
  // Update request detail status
  const requestDetail = allocation.swap_request_details.find(
    d => d.requester_id.toString() === requesterId.toString()
  );
  if (requestDetail) {
    requestDetail.status = 'accepted';
  }

  // Mark allocation as swapped
  allocation.status = 'swapped';
  await allocation.save();

  // Create new allocation for the requester
  await LeaveAllocation.create({
    friday_id: allocation.friday_id,
    department_id: allocation.department_id,
    student_id: requesterId,
    allocation_type: 'swap',
    status: 'allocated'
  });

  // Update requester profile stats
  await StudentProfile.findOneAndUpdate(
    { user_id: requesterId },
    { $inc: { total_leaves: 1, swap_count: 1 } }
  );

  // Notify requester
  const originalStudent = await User.findById(userId);
  await Notification.create({
    user_id: requesterId,
    message: `${originalStudent.name} accepted your swap request! You now have a quota spot.`,
    type: 'swap'
  });

  // Notify admin/leader
  const leader = await User.findOne({
    department_id: allocation.department_id, role: 'leader'
  });
  if (leader) {
    const requester = await User.findById(requesterId);
    await Notification.create({
      user_id: leader._id,
      message: `Swap completed: ${requester.name} took ${originalStudent.name}'s spot.`,
      type: 'swap'
    });
  }

  return { message: "Swap approved!" };
};

const rejectSwapRequest = async (allocationId, userId, requesterId) => {
  const allocation = await LeaveAllocation.findById(allocationId);
  if(!allocation) throw new Error("Allocation not found");
  if(allocation.student_id.toString() !== userId.toString()) throw new Error("Unauthorized");

  // Update detail status
  const requestDetail = allocation.swap_request_details.find(
    d => d.requester_id.toString() === requesterId.toString()
  );
  if (requestDetail) {
    requestDetail.status = 'rejected';
    await allocation.save();
  }

  // Notify requester
  const originalStudent = await User.findById(userId);
  await Notification.create({
    user_id: requesterId,
    message: `${originalStudent.name} rejected your swap request.`,
    type: 'info'
  });

  return { message: "Swap request rejected" };
};

const adminApproveSwap = async (allocationId, requesterId) => {
  const allocation = await LeaveAllocation.findById(allocationId);
  if(!allocation) throw new Error("Allocation not found");

  // Admin force-approves the swap
  allocation.status = 'swapped';
  const requestDetail = allocation.swap_request_details.find(
    d => d.requester_id.toString() === requesterId.toString()
  );
  if (requestDetail) {
    requestDetail.status = 'accepted';
  }
  await allocation.save();

  // Create new allocation for the requester
  await LeaveAllocation.create({
    friday_id: allocation.friday_id,
    department_id: allocation.department_id,
    student_id: requesterId,
    allocation_type: 'swap',
    status: 'allocated'
  });

  // Update requester profile stats
  await StudentProfile.findOneAndUpdate(
    { user_id: requesterId },
    { $inc: { total_leaves: 1, swap_count: 1 } }
  );

  // Notify both students
  const requester = await User.findById(requesterId);
  const originalStudent = await User.findById(allocation.student_id);

  await Notification.create({
    user_id: requesterId,
    message: `Admin approved your swap request. You now have a quota spot!`,
    type: 'swap'
  });

  await Notification.create({
    user_id: allocation.student_id,
    message: `Admin approved the swap — ${requester.name} has taken your spot.`,
    type: 'swap'
  });

  return { message: "Admin swap approval complete!" };
};

module.exports = {
  runRotationEngine,
  publishList,
  recalculateAfterRemoval,
  generateRotationReport,
  predictConfidence,
  getNextQuotaDate,
  requestSwap,
  acceptSwap,
  rejectSwapRequest,
  adminApproveSwap
};
