import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Every Company link is a route in this app (see App.tsx), so each is a <Link>:
 * it changes the page without reloading it. Only Connect leaves the site.
 */

export default function SiteFooter() {
  return (
    <footer className="site-footer bg-pattern-onion-footer">
      <div className="footer-content">
        <div className="footer-section">
          <h3>Onion Loop</h3>
          <p>Building better habits, one step at a time.</p>
        </div>

        <div className="footer-section">
          <h3>Company</h3>
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/about">About</Link></li>
            <li><Link to="/apps">Apps</Link></li>
            <li><Link to="/contact">Contact</Link></li>
          </ul>
        </div>

        <div className="footer-section">
          <h3>Connect</h3>
          <ul>
            <li>
              <a href="https://www.linkedin.com/company/110196382" target="_blank" rel="noopener noreferrer">
                LinkedIn
              </a>
            </li>
            <li>
              <a href="https://www.instagram.com/onionloop_llc/" target="_blank" rel="noopener noreferrer">
                Instagram
              </a>
            </li>
            <li>
              <a href="https://github.com/onionloop-llc" target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
            </li>
            <li><a href="mailto:info@onionloop.com">info@onionloop.com</a></li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} Onion Loop. All rights reserved.</p>
      </div>
    </footer>
  );
}
