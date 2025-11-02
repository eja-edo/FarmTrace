import React from 'react';
import { Link } from 'react-router-dom';
import './admin.scss';

const AdminFooter = () => {
  return (
    <footer className="admin-footer">
      <div className="admin-inner container">
        <div>© {new Date().getFullYear()} FarmTrace Admin</div>
        <div className="links">
          <Link to="/admin/docs">Docs</Link>
        </div>
      </div>
    </footer>
  );
};

export default AdminFooter;
