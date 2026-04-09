const mongoose = require('mongoose');

const uri = "mongodb+srv://rabeehmambeethi666_db_user:Fairleave2024@quotamanager.fiozrqh.mongodb.net/fairleave?appName=quotamanager";

async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const usersContainer = db.collection('users');
  const users = await usersContainer.find({}).toArray();
  console.log("Users in DB:", users.map(u => ({ email: u.email, roll_no: u.roll_no, role: u.role, is_active: u.is_active })));
  process.exit(0);
}
run();
