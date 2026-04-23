/**
 * Fix missing StudentProfiles for all active students in the current active semester.
 * Run: node fix_profiles.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

async function fix() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB\n');

  const User = require('./models/User');
  const Semester = require('./models/Semester');
  const StudentProfile = require('./models/StudentProfile');

  const activeSemester = await Semester.findOne({ is_active: true });
  if (!activeSemester) {
    console.log('No active semester found!');
    process.exit(1);
  }
  console.log(`Active semester: "${activeSemester.semester_name}" (${activeSemester._id})`);

  const students = await User.find({ role: 'student', is_active: true });
  console.log(`Found ${students.length} active students\n`);

  let created = 0;
  let skipped = 0;

  for (const student of students) {
    const existing = await StudentProfile.findOne({
      user_id: student._id,
      semester_id: activeSemester._id
    });

    if (existing) {
      skipped++;
      continue;
    }

    await StudentProfile.create({
      user_id: student._id,
      department_id: student.department_id,
      semester_id: activeSemester._id
    });
    created++;
    console.log(`  Created profile for: ${student.name} (${student.roll_no})`);
  }

  // Update semester student count
  activeSemester.total_students = students.length;
  await activeSemester.save();

  console.log(`\nDone! Created: ${created}, Skipped (already existed): ${skipped}`);
  console.log(`Updated semester total_students to: ${students.length}`);

  await mongoose.disconnect();
}

fix().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
