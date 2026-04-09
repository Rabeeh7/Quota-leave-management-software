const mongoose = require('mongoose');

const leaveAllocationSchema = new mongoose.Schema({
  friday_id: { type: mongoose.Schema.Types.ObjectId, ref: 'FridayCalendar', required: true },
  department_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  allocation_type: { 
    type: String, 
    enum: ['auto', 'manual', 'emergency', 'swap'], 
    default: 'auto' 
  },
  status: { type: String, enum: ['allocated', 'confirmed', 'spot_available', 'swapped'], default: 'allocated' },
  swap_requests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  swap_request_details: [{
    requester_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    requester_next_date: { type: Date },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    created_at: { type: Date, default: Date.now }
  }],
  rotation_debt: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('LeaveAllocation', leaveAllocationSchema);
