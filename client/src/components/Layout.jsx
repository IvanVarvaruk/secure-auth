import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      <header className="topbar">
        <Link to="/" className="brand">SecureAuth</Link>
        <nav>
          {user ? (
            <>
              <NavLink to="/profile">Профіль</NavLink>
              {user.role === 'admin' && <NavLink to="/admin">Адмін-панель</NavLink>}
              <button className="ghost" onClick={onLogout}>Вийти</button>
            </>
          ) : (
            <>
              <NavLink to="/login">Вхід</NavLink>
              <NavLink to="/register">Реєстрація</NavLink>
            </>
          )}
        </nav>
      </header>
      <main className="container">{children}</main>
    </>
  );
}
