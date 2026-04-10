const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config({ path: './server/.env' });

// Models
const Department = require('./models/Department');
const User = require('./models/User');
const StudentProfile = require('./models/StudentProfile');
const Semester = require('./models/Semester');
const FridayCalendar = require('./models/FridayCalendar');
const LeaveRequest = require('./models/LeaveRequest');
const LeaveAllocation = require('./models/LeaveAllocation');
const Notification = require('./models/Notification');

const { generateSemesterCalendar } = require('./services/calendarEngine');

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await Department.deleteMany({});
    await User.deleteMany({});
    await StudentProfile.deleteMany({});
    await Semester.deleteMany({});
    await FridayCalendar.deleteMany({});
    await LeaveRequest.deleteMany({});
    await LeaveAllocation.deleteMany({});
    await Notification.deleteMany({});

    // 1. Create Super Admin
    console.log('👑 Creating Super Admin...');
    const superadmin = await User.create({
      name: 'Super Admin',
      username: 'superadmin@fairleave.app',
      email: 'superadmin@fairleave.app',
      password: 'SuperAdmin@123',
      role: 'superadmin',
      phone: '+919876543210'
    });

    // 2. Create Department
    console.log('🏛️  Creating Department...');
    const department = await Department.create({
      name: 'CSE PG 2024',
      code: 'CSE-PG-2024',
      institution: 'ABC College of Engineering',
      requested_by: 'leader@cse.edu',
      status: 'active',
      approved_by: superadmin._id
    });

    // 3. Create Leader
    console.log('👤 Creating Leader...');
    const leader = await User.create({
      name: 'Dr. Rahman',
      username: 'leader@cse.edu',
      email: 'leader@cse.edu',
      password: 'Leader@123',
      role: 'leader',
      department_id: department._id,
      phone: '+919876543211'
    });

    // 4. Create Students
    console.log('🎓 Creating Students...');
    const students = [];
    const studentData = [
      { name: 'Mohammed Ajmal', roll_no: 'CS001', phone: '+919876540001' },
      { name: 'Sinan Ahmed', roll_no: 'CS002', phone: '+919876540002' },
      { name: 'Fathima Zahra', roll_no: 'CS003', phone: '+919876540003' },
      { name: 'Abdul Rasheed', roll_no: 'CS004', phone: '+919876540004' },
      { name: 'Noor Jahan', roll_no: 'CS005', phone: '+919876540005' }
    ];

    for (const s of studentData) {
      const student = await User.create({
        name: s.name,
        username: s.roll_no,
        roll_no: s.roll_no,
        phone: s.phone,
        password: s.roll_no, // password = roll number
        role: 'student',
        department_id: department._id
      });
      students.push(student);
    }

    // 5. Create Active Semester
    console.log('📅 Creating Semester...');
    const semesterStart = new Date('2026-01-06');
    const semesterEnd = new Date('2026-05-29');

    const semester = await Semester.create({
      department_id: department._id,
      semester_name: 'Semester 2 - 2026',
      start_date: semesterStart,
      end_date: semesterEnd,
      total_students: students.length,
      max_friday_slots: 2, // 2 slots out of 5 students for demo
      quota_percentage: 33,
      is_active: true,
      emergency_limit: 2,
      swap_enabled: true
    });

    // 6. Generate Calendar
    console.log('📆 Generating Friday Calendar...');
    await generateSemesterCalendar({
      department_id: department._id,
      semester_id: semester._id,
      start_date: semesterStart,
      end_date: semesterEnd,
      total_slots: 2,
      exam_periods: [
        { start: '2026-03-16', end: '2026-03-27' } // Mid-term exams
      ],
      break_periods: [],
      tour_dates: [],
      holiday_dates: []
    });

    // 7. Create Student Profiles
    console.log('📊 Creating Student Profiles...');
    for (let i = 0; i < students.length; i++) {
      await StudentProfile.create({
        user_id: students[i]._id,
        department_id: department._id,
        semester_id: semester._id,
        total_leaves: i < 2 ? 2 : i < 4 ? 1 : 0, // Varied for demo
        last_leave_date: i < 2 
          ? new Date('2026-02-20') 
          : i < 4 
            ? new Date('2026-01-30') 
            : null,
        emergency_count: i === 0 ? 1 : 0,
        rotation_score: 0
      });
    }

    // 8. Create sample notifications
    console.log('🔔 Creating Notifications...');
    await Notification.create({
      user_id: students[0]._id,
      message: 'Welcome to Quota Manager! Your account has been set up.',
      type: 'info'
    });
    await Notification.create({
      user_id: leader._id,
      message: 'Your department CSE PG 2024 is active. Start managing your semester!',
      type: 'info'
    });

    console.log('\n✅ Seed complete!\n');
    console.log('📋 Login Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Super Admin: superadmin@fairleave.app / SuperAdmin@123');
    console.log('Admin:       leader@cse.edu / Leader@123');
    console.log('Students:    CS001/CS001, CS002/CS002, CS003/CS003, CS004/CS004, CS005/CS005');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
};

seed();
