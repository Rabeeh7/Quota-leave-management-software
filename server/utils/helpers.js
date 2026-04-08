const jwt = require('jsonwebtoken');

/**
 * Generate JWT token for a user
 * @param {Object} user - User document from MongoDB
 * @returns {string} JWT token
 */
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

/**
 * Format date to YYYY-MM-DD string
 * @param {Date} date 
 * @returns {string}
 */
const formatDateStr = (date) => {
  return new Date(date).toISOString().split('T')[0];
};

/**
 * Get the day name from a date
 * @param {Date} date
 * @returns {string}
 */
const getDayName = (date) => {
  return new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
};

module.exports = { generateToken, formatDateStr, getDayName };
