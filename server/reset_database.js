const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Models
const AuditLog = require('./models/AuditLog');
const Department = require('./models/Department');
const DepartmentRequest = require('./models/DepartmentRequest');
const FridayCalendar = require('./models/FridayCalendar');
const LeaveAllocation = require('./models/LeaveAllocation');
const LeaveRequest = require('./models/LeaveRequest');
const Notification = require('./models/Notification');
const OverrideLog = require('./models/OverrideLog');
const Semester = require('./models/Semester');
const StudentProfile = require('./models/StudentProfile');
const User = require('./models/User');

dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    try {
      console.log('Connected to MongoDB. Wiping database...');

      // Delete all documents in dependent collections
      await AuditLog.deleteMany({});
      await Department.deleteMany({});
      await DepartmentRequest.deleteMany({});
      await FridayCalendar.deleteMany({});
      await LeaveAllocation.deleteMany({});
      await LeaveRequest.deleteMany({});
      await Notification.deleteMany({});
      await OverrideLog.deleteMany({});
      await Semester.deleteMany({});
      await StudentProfile.deleteMany({});
      
      console.log('✅ Cleared all operational documents (Audit Logs, Departments, Requests, Calendars, Allocations, Notifications, Profiles).');

      // Delete all users EXCEPT superadmin
      const result = await User.deleteMany({ role: { $ne: 'superadmin' } });
      
      console.log(`✅ Cleared ${result.deletedCount} users (kept Super Admin intact).`);

      console.log('----------------------------------------------------');
      console.log('Database has been completely wiped. Only the Super Admin remains.');
      process.exit(0);
    } catch (err) {
      console.error('Error during database wipe:', err);
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('Failed to connect to the database:', err);
    process.exit(1);
  });
