const { eachDayOfInterval, isFriday, format, isWithinInterval, parseISO } = require('date-fns');
const FridayCalendar = require('../models/FridayCalendar');
const { isPublicHoliday } = require('../utils/indianHolidays');

/**
 * Generate all Fridays between start and end date for a semester
 * Auto-blocks public holidays
 * @param {Object} params
 * @param {ObjectId} params.department_id
 * @param {ObjectId} params.semester_id
 * @param {Date} params.start_date
 * @param {Date} params.end_date
 * @param {Number} params.total_slots - default slots per Friday
 * @param {Array} params.exam_periods - [{ start: Date, end: Date }]
 * @param {Array} params.break_periods - [{ start: Date, end: Date }]
 * @param {Array} params.tour_dates - [Date]
 * @param {Array} params.holiday_dates - [Date] (manual holidays)
 * @returns {Array} created FridayCalendar documents
 */
const generateSemesterCalendar = async ({
  department_id,
  semester_id,
  start_date,
  end_date,
  total_slots = 12,
  exam_periods = [],
  break_periods = [],
  tour_dates = [],
  holiday_dates = []
}) => {
  // Delete existing calendar entries for this semester
  await FridayCalendar.deleteMany({ semester_id });

  // Get all days in range
  const allDays = eachDayOfInterval({
    start: new Date(start_date),
    end: new Date(end_date)
  });

  // Filter only Fridays
  const fridays = allDays.filter(day => isFriday(day));

  const calendarEntries = [];

  for (const friday of fridays) {
    const dateStr = format(friday, 'yyyy-MM-dd');
    let status = 'open';
    let block_reason = null;
    let block_type = null;

    // Check if it's a public holiday
    const holidayCheck = isPublicHoliday(dateStr);
    if (holidayCheck.isHoliday) {
      status = 'blocked';
      block_reason = holidayCheck.name;
      block_type = 'holiday';
    }

    // Check if within exam periods
    if (status === 'open') {
      for (const period of exam_periods) {
        if (isWithinInterval(friday, { 
          start: new Date(period.start), 
          end: new Date(period.end) 
        })) {
          status = 'blocked';
          block_reason = 'Exam period';
          block_type = 'exam';
          break;
        }
      }
    }

    // Check if within break periods
    if (status === 'open') {
      for (const period of break_periods) {
        if (isWithinInterval(friday, { 
          start: new Date(period.start), 
          end: new Date(period.end) 
        })) {
          status = 'blocked';
          block_reason = 'Semester break';
          block_type = 'semester_break';
          break;
        }
      }
    }

    // Check if it's a tour date
    if (status === 'open') {
      const isTourDate = tour_dates.some(d => 
        format(new Date(d), 'yyyy-MM-dd') === dateStr
      );
      if (isTourDate) {
        status = 'blocked';
        block_reason = 'Department tour/event';
        block_type = 'tour';
      }
    }

    // Check manual holiday dates
    if (status === 'open') {
      const isManualHoliday = holiday_dates.some(d => 
        format(new Date(d), 'yyyy-MM-dd') === dateStr
      );
      if (isManualHoliday) {
        status = 'blocked';
        block_reason = 'Holiday (manual)';
        block_type = 'holiday';
      }
    }

    // Check if Friday has passed
    if (friday < new Date()) {
      status = 'passed';
    }

    calendarEntries.push({
      department_id,
      semester_id,
      friday_date: friday,
      status,
      block_reason,
      block_type,
      total_slots
    });
  }

  // Bulk insert
  const created = await FridayCalendar.insertMany(calendarEntries);
  return created;
};

/**
 * Calculate semester statistics from calendar
 * @param {ObjectId} semester_id
 * @param {Number} total_students
 * @returns {Object} stats
 */
const getCalendarStats = async (semester_id, total_students) => {
  const allFridays = await FridayCalendar.find({ semester_id });
  
  const totalFridays = allFridays.length;
  const blockedFridays = allFridays.filter(f => f.status === 'blocked').length;
  const passedFridays = allFridays.filter(f => f.status === 'passed').length;
  const validFridays = allFridays.filter(f => 
    f.status !== 'blocked' && f.status !== 'passed'
  ).length;
  
  const totalSlots = allFridays
    .filter(f => f.status !== 'blocked' && f.status !== 'passed')
    .reduce((sum, f) => sum + f.total_slots, 0);
  
  const quotaAverage = total_students > 0 
    ? Math.round((totalSlots / total_students) * 100) / 100 
    : 0;

  return {
    totalFridays,
    blockedFridays,
    passedFridays,
    validFridays,
    totalSlots,
    quotaAverage,
    total_students
  };
};

module.exports = { generateSemesterCalendar, getCalendarStats };
