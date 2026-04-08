const mongoose = require('mongoose');

const departmentRequestSchema = new mongoose.Schema({
  department_name: { type: String, required: true },
  institution: { type: String, required: true },
  requester_name: { type: String, required: true },
  requester_email: { type: String, required: true },
  requester_phone: { type: String },
  class_size: { type: Number },
  message: { type: String },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  reviewed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DepartmentRequest', departmentRequestSchema);
