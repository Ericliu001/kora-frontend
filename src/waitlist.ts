/**
 * The waitlist lives in a Google Form, not on our server: the form keeps the
 * details people leave, and this app only links to it.
 *
 * Paste the form's share link here (Google Forms → Send → link). While this is
 * empty the "Join the waitlist" button is not shown anywhere, so the site can
 * ship before the form exists without a button that goes nowhere.
 */
export const WAITLIST_FORM_URL = 'https://forms.gle/MnqtRdLy1xc7uR7m8';

/** What joining gets you. Shown under the button wherever it appears. */
export const WAITLIST_OFFER = "Get the full course free for 90 days when it's ready.";
