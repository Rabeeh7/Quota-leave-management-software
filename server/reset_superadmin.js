const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');

dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    try {
      const superadmin = await User.findOne({ role: 'superadmin' });
      
      if (!superadmin) {
        console.log('❌ No superadmin found in DB!');
        process.exit(1);
      }

      console.log(`Found superadmin: ${superadmin.email}`);
      superadmin.password = 'SuperAdmin@123';
      await superadmin.save();
      console.log('✅ Password reset to SuperAdmin@123');
      process.exit(0);
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });
