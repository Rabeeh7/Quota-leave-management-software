const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  department_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  friday_id: { type: mongoose.Schema.Types.ObjectId, ref: 'FridayCalendar', required: true },
  request_type: { 
    type: String, 
    enum: ['normal', 'emergency', 'swap'], 
    default: 'normal' 
  },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'denied', 'released'], 
    default: 'pending' 
  },
  reason: { type: String },
  swap_with_student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
