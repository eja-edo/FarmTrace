import React from 'react';
import { Link } from 'react-router-dom';
import './admin.scss';

const AdminHeader = () => {
  return (
    <header className="admin-header">
      <div className="admin-inner container">
        <div className="brand">Admin • FarmTrace</div>
        <nav className="admin-nav">
          <Link to="/admin/login">Login</Link>
          <Link to="/admin/dashboard">Dashboard</Link>
        </nav>
      </div>
    </header>
  );
};

export default AdminHeader;
