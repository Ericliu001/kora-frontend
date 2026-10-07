import React from 'react';
import { Link } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';

/** There are no apps yet. This page says so instead of the link going nowhere. */
export default function AppsScreen() {
  usePageTitle('Apps');

  return (
    <section className="info-page">
      <h1>Apps are coming soon</h1>
      <p>For now Onion Loop runs in your browser, on a phone or a computer.</p>
      <Link to="/" className="primary-button">
        Start practising
      </Link>
    </section>
  );
}
