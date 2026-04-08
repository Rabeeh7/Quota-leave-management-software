const mongoose = require('mongoose');

const overrideLogSchema = new mongoose.Schema({
  friday_id: { type: mongoose.Schema.Types.ObjectId, ref: 'FridayCalendar', required: true },
  department_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  action: { type: String, required: true },
  target_student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reason: { type: String },
  performed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('OverrideLog', overrideLogSchema);
