const mongoose = require('mongoose');

const studentProfileSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  department_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  semester_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Semester' },
  total_leaves: { type: Number, default: 0 },
  last_leave_date: { type: Date },
  emergency_count: { type: Number, default: 0 },
  swap_count: { type: Number, default: 0 },
  skipped_turns: { type: Number, default: 0 },
  fairness_score: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('StudentProfile', studentProfileSchema);
