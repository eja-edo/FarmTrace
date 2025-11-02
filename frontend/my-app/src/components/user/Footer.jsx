import React from 'react';
import './Layout.scss';

const Footer = () => {
  return (
    <footer className="app-footer">
      <div className="container footer-inner">
        <div>
          <small>© {new Date().getFullYear()} FarmTrace — All rights reserved.</small>
        </div>
        <div className="footer-links">
          <a href="/terms" onClick={(e)=>e.preventDefault()}>Terms</a>
          <a href="/privacy" onClick={(e)=>e.preventDefault()}>Privacy</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
