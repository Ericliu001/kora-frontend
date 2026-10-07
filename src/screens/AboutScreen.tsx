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
        Onion Loop is a place to practise social skills. It is for people who find it hard to talk
        to people: starting a conversation, keeping small talk going, or knowing what to say next.
      </p>
      <p>
        You improve by practising, so every exercise is a conversation. You watch a short video of
        someone talking to you, reply by speaking or typing, and get feedback on that reply.
      </p>
      <p>
        The first exercises are small talk: saying hello, giving an answer the other person can
        build on, and showing you are listening. Exercises for harder conversations are on the way.
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
