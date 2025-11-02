import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaLock, FaLeaf } from 'react-icons/fa';
import './Login.scss';

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Simulate API call
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      if (username === 'admin' && password === 'admin') {
        navigate('/admin/dashboard');
      } else {
        setError('Invalid credentials. Use admin/admin for demo.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-wrapper">
        <div className="login-left">
          <div className="login-overlay"></div>
          <div className="login-content">
            <h1>AgriTech Admin</h1>
            <h2>Smart Agriculture Management</h2>
            <p>Monitor and manage your agricultural IoT devices, sensors, and data in real-time.</p>
          </div>
        </div>
        <div className="login-right">
          <div className="login-form-container">
            <div className="login-header">
              <div className="logo-container">
                <div className="logo">
                  <FaLeaf />
                </div>
              </div>
              <h2>Welcome Back</h2>
              <p>Please sign in to your admin account</p>
            </div>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label>Username</label>
                <div className="input-with-icon">
                  <FaUser />
                  <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Password</label>
                <div className="input-with-icon">
                  <FaLock />
                  <input 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                  />
                </div>
              </div>

              <div className="form-options">
                <label className="remember-me">
                  <input type="checkbox" /> Remember me
                </label>
                <a href="#" className="forgot-password">Forgot password?</a>
              </div>

              <button type="submit" className={`login-button ${loading ? 'loading' : ''}`} disabled={loading}>
                {loading ? <span className="spinner"></span> : 'Sign In'}
              </button>
            </form>

            <div className="login-footer">
              © {new Date().getFullYear()} AgriTech Admin Portal. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
