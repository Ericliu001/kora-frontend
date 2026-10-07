import React from 'react';
import { usePageTitle } from '../hooks/usePageTitle';

/**
 * How to reach us. An email link rather than a form: a form needs an endpoint
 * to post to and something to keep spam out, and this does the same job.
 */
export default function ContactScreen() {
  usePageTitle('Contact');

  return (
    <section className="info-page">
      <h1>Contact</h1>
      <p>
        Email <a href="mailto:info@onionloop.com">info@onionloop.com</a>.
      </p>
      <p>You can also find us here:</p>
      <ul className="info-links">
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
      </ul>
    </section>
  );
}
