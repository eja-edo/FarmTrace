import React from 'react';
import { Link } from 'react-router-dom';
import './Layout.scss';

const Header = () => {
  return (
    <header className="app-header">
      <div className="container header-inner">
        <div className="brand">
          <Link to="/" className="brand-link">🌱 FarmTrace</Link>
        </div>

        <nav className="nav-links">
          <Link to="/mappage">Map</Link>
          <Link to="/temp-monitor">Monitor</Link>
          <Link to="/login">Login</Link>
        </nav>
      </div>
    </header>
  );
};

export default Header;
