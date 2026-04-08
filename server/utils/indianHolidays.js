// Major Indian Public Holidays — used by Calendar Engine to auto-block Fridays
// Covers 2024–2027. Dates that commonly fall on or near Fridays are included.
// Format: { date: 'YYYY-MM-DD', name: 'Holiday Name' }

const indianHolidays = [
  // 2024
  { date: '2024-01-26', name: 'Republic Day' },
  { date: '2024-03-25', name: 'Holi' },
  { date: '2024-03-29', name: 'Good Friday' },
  { date: '2024-04-11', name: 'Eid ul-Fitr' },
  { date: '2024-04-14', name: 'Ambedkar Jayanti' },
  { date: '2024-04-17', name: 'Ram Navami' },
  { date: '2024-04-21', name: 'Mahavir Jayanti' },
  { date: '2024-05-23', name: 'Buddha Purnima' },
  { date: '2024-06-17', name: 'Eid ul-Adha' },
  { date: '2024-07-17', name: 'Muharram' },
  { date: '2024-08-15', name: 'Independence Day' },
  { date: '2024-08-26', name: 'Janmashtami' },
  { date: '2024-09-16', name: 'Milad-un-Nabi' },
  { date: '2024-10-02', name: 'Gandhi Jayanti' },
  { date: '2024-10-12', name: 'Dussehra' },
  { date: '2024-10-31', name: 'Halloween / Sardar Patel Jayanti' },
  { date: '2024-11-01', name: 'Diwali' },
  { date: '2024-11-15', name: 'Guru Nanak Jayanti' },
  { date: '2024-12-25', name: 'Christmas' },

  // 2025
  { date: '2025-01-14', name: 'Makar Sankranti / Pongal' },
  { date: '2025-01-26', name: 'Republic Day' },
  { date: '2025-02-26', name: 'Maha Shivaratri' },
  { date: '2025-03-14', name: 'Holi' },
  { date: '2025-03-30', name: 'Eid ul-Fitr' },
  { date: '2025-04-06', name: 'Ram Navami' },
  { date: '2025-04-10', name: 'Mahavir Jayanti' },
  { date: '2025-04-14', name: 'Ambedkar Jayanti' },
  { date: '2025-04-18', name: 'Good Friday' },
  { date: '2025-05-12', name: 'Buddha Purnima' },
  { date: '2025-06-07', name: 'Eid ul-Adha' },
  { date: '2025-07-06', name: 'Muharram' },
  { date: '2025-08-15', name: 'Independence Day' },
  { date: '2025-08-16', name: 'Janmashtami' },
  { date: '2025-09-05', name: 'Milad-un-Nabi' },
  { date: '2025-10-02', name: 'Gandhi Jayanti / Dussehra' },
  { date: '2025-10-20', name: 'Diwali' },
  { date: '2025-11-05', name: 'Guru Nanak Jayanti' },
  { date: '2025-12-25', name: 'Christmas' },

  // 2026
  { date: '2026-01-14', name: 'Makar Sankranti / Pongal' },
  { date: '2026-01-26', name: 'Republic Day' },
  { date: '2026-02-15', name: 'Maha Shivaratri' },
  { date: '2026-03-04', name: 'Holi' },
  { date: '2026-03-20', name: 'Eid ul-Fitr' },
  { date: '2026-03-27', name: 'Ram Navami' },
  { date: '2026-04-03', name: 'Good Friday' },
  { date: '2026-04-05', name: 'Mahavir Jayanti' },
  { date: '2026-04-14', name: 'Ambedkar Jayanti' },
  { date: '2026-05-01', name: 'May Day' },
  { date: '2026-05-27', name: 'Eid ul-Adha' },
  { date: '2026-06-25', name: 'Muharram' },
  { date: '2026-08-15', name: 'Independence Day' },
  { date: '2026-08-25', name: 'Milad-un-Nabi' },
  { date: '2026-10-02', name: 'Gandhi Jayanti' },
  { date: '2026-10-19', name: 'Dussehra' },
  { date: '2026-11-08', name: 'Diwali' },
  { date: '2026-12-25', name: 'Christmas' },

  // 2027
  { date: '2027-01-14', name: 'Makar Sankranti / Pongal' },
  { date: '2027-01-26', name: 'Republic Day' },
  { date: '2027-03-09', name: 'Eid ul-Fitr' },
  { date: '2027-03-22', name: 'Holi' },
  { date: '2027-03-26', name: 'Good Friday' },
  { date: '2027-04-14', name: 'Ambedkar Jayanti' },
  { date: '2027-05-16', name: 'Eid ul-Adha' },
  { date: '2027-08-15', name: 'Independence Day' },
  { date: '2027-10-02', name: 'Gandhi Jayanti' },
  { date: '2027-10-08', name: 'Dussehra' },
  { date: '2027-10-28', name: 'Diwali' },
  { date: '2027-12-25', name: 'Christmas' }
];

/**
 * Check if a given date string (YYYY-MM-DD) is a public holiday
 * @param {string} dateStr - Date in YYYY-MM-DD format
 * @returns {{ isHoliday: boolean, name: string|null }}
 */
const isPublicHoliday = (dateStr) => {
  const holiday = indianHolidays.find(h => h.date === dateStr);
  return { isHoliday: !!holiday, name: holiday ? holiday.name : null };
};

/**
 * Get all holidays within a date range
 * @param {Date} startDate 
 * @param {Date} endDate 
 * @returns {Array}
 */
const getHolidaysInRange = (startDate, endDate) => {
  const start = new Date(startDate).toISOString().split('T')[0];
  const end = new Date(endDate).toISOString().split('T')[0];
  return indianHolidays.filter(h => h.date >= start && h.date <= end);
};

module.exports = { indianHolidays, isPublicHoliday, getHolidaysInRange };
