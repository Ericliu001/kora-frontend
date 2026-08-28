import { useCallback, useEffect, useRef, useState } from 'react';
import { request } from '../api';
import { AppError, toAppError, VOICE_DENIED, VOICE_UNSUPPORTED } from '../errors';

/**
 * Speak-your-reply, as a self-contained piece.
 *
 * The recorder, the stream and the upload belong together and nowhere else —
 * everything the practice loop needs to know is "are they recording", "are we
 * writing it down", and eventually a string of text.
 *
 * [supported] is decided at mount rather than on click, so a browser that
 * cannot record says so beside the button instead of failing when pressed.
 */
export function useVoiceInput({
  practiceId,
  onBeforeStart,
  onTranscript,
}: {
  practiceId: string | null;
  /** Called just before the microphone opens — she should stop talking first. */
  onBeforeStart: () => void;
  onTranscript: (text: string) => void;
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<AppError | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [supported] = useState(
    () =>
      typeof window !== 'undefined' &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof window.MediaRecorder === 'function',
  );

  // Leaving the page mid-recording must not leave the microphone light on.
  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), []);

  const toggle = useCallback(async () => {
    if (isRecording) {
      recorderRef.current?.stop();
      return;
    }
    if (!supported) {
      setError(VOICE_UNSUPPORTED);
      return;
    }
    if (!practiceId) return;

    setError(null);
    onBeforeStart();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(stream);
      streamRef.current = stream;
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onstop = async () => {
        setIsRecording(false);
        stream.getTracks().forEach((track) => track.stop());
        setIsTranscribing(true);
        try {
          const form = new FormData();
          form.append(
            'audio',
            new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }),
            'reflection.webm',
          );
          const result = await request<{ transcript: string }>(
            `/practices/${practiceId}/transcribe`,
            { method: 'POST', body: form },
          );
          onTranscript(result.transcript);
        } catch (reason) {
          setError(toAppError(reason, 'We could not write that down. You can still type your reply.'));
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start();
      setIsRecording(true);
    } catch {
      // Denied, or no device. Either way the answer is the same: type it.
      setError(VOICE_DENIED);
    }
  }, [isRecording, practiceId, supported, onBeforeStart, onTranscript]);

  return { supported, isRecording, isTranscribing, toggle, error };
}

export default useVoiceInput;
