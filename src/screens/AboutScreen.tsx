import React from 'react';
import { Link } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';

/** What Onion Loop is. Plain text: nothing here comes from the server. */
export default function AboutScreen() {
  usePageTitle('About');

  return (
    <section className="info-page">
      <h1>About Onion Loop</h1>
      <p>
        Onion Loop makes conversation practice for people who find talking to others hard.
      </p>
      <p>
        You watch a short video of someone talking to you, reply by speaking or typing, and get
        feedback on that reply.
      </p>
      <p>
        The feedback is about what you said: whether you listened, what you picked up and what you
        missed. It does not mark your accent or your grammar.
      </p>
      <Link to="/" className="primary-button">
        Start practising
      </Link>
    </section>
  );
}
