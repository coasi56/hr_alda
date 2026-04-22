import { NavLink } from 'react-router-dom';

const NAV = [
  { to: '/alda', icon: '⭐', label: '알다 인정' },
];

export default function Sidebar() {
  return (
    <aside style={{
      width: 220,
      minWidth: 220,
      background: 'var(--sidebar-bg)',
      display: 'flex',
      flexDirection: 'column',
      padding: '0',
    }}>
      <div style={{
        padding: '20px 20px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>HR알다</div>
        <div style={{ fontSize: 11, color: 'var(--sidebar-text)', marginTop: 2 }}>관리자 대시보드</div>
      </div>

      <nav style={{ flex: 1, padding: '12px 10px' }}>
        {NAV.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 12px',
              borderRadius: 8,
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: isActive ? 600 : 400,
              color: isActive ? '#fff' : 'var(--sidebar-text)',
              background: isActive ? 'var(--sidebar-active)' : 'transparent',
              marginBottom: 2,
            })}
          >
            <span style={{ fontSize: 16 }}>{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 11, color: 'var(--sidebar-text)', textAlign: 'center' }}>
        v0.1.0 · Phase 3
      </div>
    </aside>
  );
}
