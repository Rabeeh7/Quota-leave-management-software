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

const getWindowDates = (fridayDate, semester) => {
  const dayMap = { 'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6 };
  
  const friday = new Date(fridayDate);
  
  const getDateForDayBeforeFriday = (dayName, timeStr) => {
    let targetDay = dayMap[dayName] !== undefined ? dayMap[dayName] : 3;
    let diff = 5 - targetDay; 
    if (diff <= 0) diff += 7; 

    const d = new Date(friday);
    d.setDate(d.getDate() - diff);
    
    if (timeStr) {
      const parts = timeStr.split(':');
      if (parts.length >= 2) {
        d.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10), 0, 0);
      }
    }
    return d;
  };

  const openDate = getDateForDayBeforeFriday(semester.request_open_day, semester.request_open_time);
  const deadlineDate = getDateForDayBeforeFriday(semester.request_deadline_day, semester.request_deadline_time);
  
  return { openDate, deadlineDate };
};

module.exports = { generateToken, formatDateStr, getDayName, getWindowDates };
