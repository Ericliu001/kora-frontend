import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';

/**
 * Onion Loop chrome. The wordmark is the company and, for now, the only public
 * name — so there is no product pill beside it.
 *
 * No hamburger: there is one link here. A menu button that opens a list of one
 * is furniture, not navigation.
 */
export default function SiteHeader() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="site-header">
      <nav className="site-nav">
        <Link to="/" className="brand">
          <img src={`${process.env.PUBLIC_URL}/brand/logo.png`} alt="" className="logo-icon" />
          Onion Loop
        </Link>
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </nav>
    </header>
  );
}
