const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const uri = "mongodb+srv://rabeehmambeethi666_db_user:Fairleave2024@quotamanager.fiozrqh.mongodb.net/fairleave?appName=quotamanager";

async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const usersContainer = db.collection('users');
  const user = await usersContainer.findOne({ roll_no: 'CS001' });
  
  const isMatch = await bcrypt.compare('CS001', user.password);
  console.log("Password matches?", isMatch);
  process.exit(0);
}
run();
