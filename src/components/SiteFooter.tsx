import React from 'react';
import { Link } from 'react-router-dom';

/**
 * The marketing pages live on the static site, not in this app, so those links
 * are absolute and leave. Only the gym's own routes stay internal.
 */
const SITE = 'https://onionloop.com';

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
            <li><a href={`${SITE}/index.html`}>Home</a></li>
            <li><a href={`${SITE}/about.html`}>About</a></li>
            <li><a href={`${SITE}/services.html`}>Apps</a></li>
            <li><a href={`${SITE}/contact.html`}>Contact</a></li>
          </ul>
        </div>

        <div className="footer-section">
          <h3>Kora</h3>
          <ul>
            <li><Link to="/">All modules</Link></li>
            <li><a href={`${SITE}/services.html`}>Why we built it</a></li>
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
