/**
 * Quick diagnostic script to check why students see "No Active Semester"
 * Run: node diagnose.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

async function diagnose() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB\n');

  const User = require('./models/User');
  const Semester = require('./models/Semester');
  const Department = require('./models/Department');
  const StudentProfile = require('./models/StudentProfile');

  // 1. Check all active semesters
  const activeSemesters = await Semester.find({ is_active: true });
  console.log(`=== Active Semesters (${activeSemesters.length}) ===`);
  for (const s of activeSemesters) {
    console.log(`  ID: ${s._id}`);
    console.log(`  Name: ${s.semester_name}`);
    console.log(`  department_id: ${s.department_id || '(NONE - global)'}`);
    console.log(`  Dates: ${s.start_date?.toISOString()} to ${s.end_date?.toISOString()}`);
    console.log('');
  }

  // 2. Check all departments
  const departments = await Department.find();
  console.log(`=== Departments (${departments.length}) ===`);
  for (const d of departments) {
    console.log(`  ${d.name} (${d.code}) - ID: ${d._id} - Status: ${d.status}`);
  }
  console.log('');

  // 3. Check all students and their department associations
  const students = await User.find({ role: 'student' }).select('-password');
  console.log(`=== Students (${students.length}) ===`);
  for (const s of students) {
    const dept = s.department_id ? await Department.findById(s.department_id) : null;
    console.log(`  ${s.name} (${s.roll_no}) - Dept: ${dept?.name || 'NONE'} (${s.department_id || 'NULL'}) - Active: ${s.is_active}`);
    
    // Check if they have a profile for any active semester
    for (const sem of activeSemesters) {
      const profile = await StudentProfile.findOne({ user_id: s._id, semester_id: sem._id });
      console.log(`    Profile for "${sem.semester_name}": ${profile ? 'EXISTS' : 'MISSING'}`);
    }
  }
  console.log('');

  // 4. Check leaders
  const leaders = await User.find({ role: 'leader' }).select('-password');
  console.log(`=== Leaders (${leaders.length}) ===`);
  for (const l of leaders) {
    const dept = l.department_id ? await Department.findById(l.department_id) : null;
    console.log(`  ${l.name} - Dept: ${dept?.name || 'NONE'} (${l.department_id || 'NULL'})`);
  }

  await mongoose.disconnect();
  console.log('\nDone.');
}

diagnose().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
