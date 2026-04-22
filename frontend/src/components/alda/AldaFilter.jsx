const OPTIONS = [
  { value: 'today', label: '오늘' },
  { value: 'this_week', label: '이번 주' },
  { value: 'this_month', label: '이번 달' },
  { value: 'all', label: '전체' },
];

export default function AldaFilter({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          className={`btn btn-ghost${value === opt.value ? ' active' : ''}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
