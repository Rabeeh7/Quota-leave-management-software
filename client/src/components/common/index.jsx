export const Spinner = ({ size = 'md' }) => {
  const sizes = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <div className={`${sizes[size]} border-3 border-accent/20 border-t-accent rounded-full animate-spin`} />
  );
};

export const PageLoader = () => (
  <div className="flex items-center justify-center py-20">
    <Spinner size="lg" />
  </div>
);

export const EmptyState = ({ icon = '📭', title, message }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <span className="text-5xl mb-4">{icon}</span>
    <h3 className="font-heading text-lg text-white mb-2">{title}</h3>
    <p className="text-text-secondary text-sm max-w-sm">{message}</p>
  </div>
);

export const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative ${maxWidth} w-full bg-card border border-border-subtle rounded-2xl shadow-xl animate-slide-up`}>
        {title && (
          <div className="flex items-center justify-between p-5 border-b border-border-subtle">
            <h2 className="font-heading text-lg text-white">{title}</h2>
            <button onClick={onClose} className="text-text-muted hover:text-white transition-colors text-xl">✕</button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

export const KPICard = ({ icon, label, value, trend, color = 'text-white' }) => (
  <div className="kpi-card">
    <div className="flex items-center justify-between">
      <span className="text-2xl">{icon}</span>
      {trend && (
        <span className={`text-xs font-medium ${trend > 0 ? 'text-success' : 'text-danger'}`}>
          {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </span>
      )}
    </div>
    <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
    <p className="text-sm text-text-secondary">{label}</p>
  </div>
);

export const Badge = ({ type = 'neutral', children }) => {
  const classes = {
    success: 'badge-success',
    warning: 'badge-warning',
    danger: 'badge-danger',
    accent: 'badge-accent',
    neutral: 'badge-neutral',
  };
  return <span className={classes[type] || classes.neutral}>{children}</span>;
};

export const RotationRing = ({ score, size = 80, label }) => {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const normalizedScore = Math.min(100, Math.max(0, score));
  const offset = circumference - (normalizedScore / 100) * circumference;
  
  const color = normalizedScore >= 70 ? '#16A34A' : normalizedScore >= 40 ? '#D97706' : '#DC2626';

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size/2} cy={size/2} r={radius}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6"
        />
        <circle
          cx={size/2} cy={size/2} r={radius}
          fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-lg font-bold tabular-nums text-white">{Math.round(normalizedScore)}</span>
      </div>
      {label && <span className="text-xs text-text-secondary mt-1">{label}</span>}
    </div>
  );
};
