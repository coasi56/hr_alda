import { useAuth } from '../../hooks/useAuth.js';
import { useNavigate } from 'react-router-dom';

export default function Header() {
  const { email, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header style={{
      height: 56,
      background: 'var(--white)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      padding: '0 24px',
      gap: 12,
    }}>
      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{email}</span>
      <button className="btn btn-ghost" style={{ padding: '6px 12px' }} onClick={handleLogout}>
        로그아웃
      </button>
    </header>
  );
}
