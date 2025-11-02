import React from 'react';
import { Outlet } from 'react-router-dom';
import AdminHeader from './AdminHeader';
import AdminFooter from './AdminFooter';
import './admin.scss';

const AdminLayout = () => {
  return (
    <div className="admin-layout">
      <AdminHeader />

      <main className="admin-content">
        <Outlet />
      </main>

      <AdminFooter />
    </div>
  );
};

export default AdminLayout;
