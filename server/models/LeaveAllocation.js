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
  rotation_debt: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('LeaveAllocation', leaveAllocationSchema);
