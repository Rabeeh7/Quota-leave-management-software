export const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export const formatDateLong = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

export const getInitials = (name) => {
  if (!name) return '??';
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export const getDaysUntil = (date) => {
  if (!date) return null;
  const now = new Date();
  const target = new Date(date);
  const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  return diff;
};

export const getBlockTypeConfig = (type) => {
  const configs = {
    exam: { icon: '🔒', color: 'text-danger', bg: 'bg-danger/10', label: 'Exam' },
    holiday: { icon: '🚩', color: 'text-warning', bg: 'bg-warning/10', label: 'Holiday' },
    semester_break: { icon: '⏸️', color: 'text-neutral', bg: 'bg-neutral/10', label: 'Break' },
    tour: { icon: '🧭', color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'Tour' },
    hod_order: { icon: '🛡️', color: 'text-purple-400', bg: 'bg-purple-400/10', label: 'HOD Order' },
  };
  return configs[type] || { icon: '❌', color: 'text-neutral', bg: 'bg-neutral/10', label: 'Blocked' };
};

export const getRolePath = (role) => {
  switch (role) {
    case 'superadmin': return '/superadmin/dashboard';
    case 'leader': return '/leader/dashboard';
    case 'student': return '/student/dashboard';
    default: return '/login';
  }
};
