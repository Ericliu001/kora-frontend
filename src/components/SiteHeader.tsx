import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';

/**
 * Onion Loop chrome. The wordmark is the company, the pill beside it is which
 * product you are standing in — Kora is one surface of several.
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
        <span className="product-tag">KORA</span>
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
