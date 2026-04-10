const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String },
  roll_no: { type: String },
  phone: { type: String },
  email: { type: String },
  password: { type: String, required: true },
  role: { type: String, enum: ['superadmin', 'leader', 'student'], required: true },
  department_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  is_active: { type: Boolean, default: true },
  notes: { type: String },
  created_at: { type: Date, default: Date.now }
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.hasHashedPassword = function() {
  return /^\$2[aby]\$\d{2}\$/.test(this.password);
};

userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;

  if (this.hasHashedPassword()) {
    return await bcrypt.compare(candidatePassword, this.password);
  }

  return String(candidatePassword) === String(this.password);
};

module.exports = mongoose.model('User', userSchema);
