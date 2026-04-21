const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { generateToken } = require('../utils/helpers');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
       const { username, email, password } = req.body;

    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }

    const emailTrim = email != null && String(email).trim() !== ''
      ? String(email).toLowerCase().trim()
      : null;
    const usernameTrim = username != null && String(username).trim() !== ''
      ? String(username).trim()
      : null;

    if (!emailTrim && !usernameTrim) {
      return res.status(400).json({ message: 'Email or username is required' });
    }

    let user;

    // Prefer explicit `email` (Admin / Leader tab)
    if (emailTrim) {
      user = await User.findOne({ email: emailTrim });
    } else {
      // For student tab or legacy login, check multiple fields
      const query = {
        $or: [
          { roll_no: usernameTrim },
          { username: usernameTrim },
          { email: usernameTrim.toLowerCase() },
          { name: usernameTrim }
        ]
      };
      user = await User.findOne(query);
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.is_active) {
      return res.status(403).json({ message: 'Account is deactivated' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Support legacy/plain-text records created outside Mongoose by
    // upgrading them to a hashed password after the first successful login.
    if (!user.hasHashedPassword()) {
      user.password = password;
      await user.save();
    }

    const token = generateToken(user);

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        roll_no: user.roll_no,
        role: user.role,
        department_id: user.department_id,
        is_active: user.is_active
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message || error.toString() });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  // JWT is stateless — client just removes token
  res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('department_id');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/auth/change-password
router.put('/change-password', auth, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    const user = await User.findById(req.user._id);
    const isMatch = await user.comparePassword(current_password);

    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    user.password = new_password;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
