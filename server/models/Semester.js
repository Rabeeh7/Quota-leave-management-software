const mongoose = require('mongoose');

const semesterSchema = new mongoose.Schema({
  department_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  semester_name: { type: String, required: true },
  start_date: { type: Date, required: true },
  end_date: { type: Date, required: true },
  total_students: { type: Number, default: 0 },
  quota_percentage: { type: Number, default: 33 },
  max_friday_slots: { type: Number, default: 12 },
  request_deadline_day: { type: String, default: 'Wednesday' },
  request_deadline_time: { type: String, default: '09:00' },
  swap_enabled: { type: Boolean, default: true },
  emergency_limit: { type: Number, default: 2 },
  is_active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Semester', semesterSchema);
