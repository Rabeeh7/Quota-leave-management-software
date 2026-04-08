const mongoose = require('mongoose');

const fridayCalendarSchema = new mongoose.Schema({
  department_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  semester_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Semester', required: true },
  friday_date: { type: Date, required: true },
  status: { 
    type: String, 
    enum: ['open', 'locked', 'published', 'blocked', 'holiday', 'passed'], 
    default: 'open' 
  },
  block_reason: { type: String },
  block_type: { 
    type: String, 
    enum: ['exam', 'holiday', 'tour', 'hod_order', 'semester_break', null],
    default: null
  },
  total_slots: { type: Number, default: 12 },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('FridayCalendar', fridayCalendarSchema);
