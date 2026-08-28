// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

/**
 * jsdom ships no microphone, and the app now hides the Speak button when the
 * browser cannot record. Without these two stubs every test would run as if it
 * were in a browser from 2012 — so the default here is "recording works", and
 * the tests that care about the other case take them away deliberately.
 *
 * Neither stub records anything. They exist so feature detection says yes.
 */
class StubMediaRecorder {
  static isTypeSupported = () => true;
  mimeType = 'audio/webm';
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  start() {}
  stop() {
    this.onstop?.();
  }
}

Object.defineProperty(window, 'MediaRecorder', {
  writable: true,
  configurable: true,
  value: StubMediaRecorder,
});

Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  configurable: true,
  value: { getUserMedia: async () => ({ getTracks: () => [] }) },
});
