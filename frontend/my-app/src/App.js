import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/user/Login';
import MapPage from './pages/user/MapPage';
import TempHumidityMonitor from './pages/user/TempHumidityMonitor';
import UserLayout from './components/user/Layout';

import AdminLayout from './components/admin/AdminLayout';
import AdminLogin from './pages/admin/login/Login';
import AdminDashboard from './pages/admin/dashboard/Dashboard';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public / user routes use UserLayout */}
        <Route element={<UserLayout />}>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/mappage" element={<MapPage />} />
          <Route path="/temp-monitor" element={<TempHumidityMonitor />} />
        </Route>

        {/* Admin routes use AdminLayout */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="login" element={<AdminLogin />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          {/* Add more admin routes here as nested routes */}
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
