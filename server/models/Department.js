const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  institution: { type: String, required: true },
  requested_by: { type: String },
  status: { type: String, enum: ['pending', 'active', 'suspended'], default: 'pending' },
  approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  request_open_day: { type: String, default: 'Tuesday' },
  request_open_time: { type: String, default: '00:00' },
  request_deadline_day: { type: String, default: 'Wednesday' },
  request_deadline_time: { type: String, default: '17:00' },
  max_friday_slots: { type: Number, default: 12 },
  emergency_limit: { type: Number, default: 2 },
  swap_enabled: { type: Boolean, default: true },
  swap_hours: { type: Number, default: 24 },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Department', departmentSchema);
