const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  department_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  friday_id: { type: mongoose.Schema.Types.ObjectId, ref: 'FridayCalendar' },
  action: { type: String, required: true },
  performed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  target_student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  details: { type: String },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
