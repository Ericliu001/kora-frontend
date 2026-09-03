import React from 'react';
import { Turn } from '../types';

/**
 * The speaker's clip. Rendered only when there is video to play — which today
 * is never: the whole curriculum is written, and a turn with no clip puts its
 * words straight into the transcript instead.
 *
 * Kept because "no clip" is not a fallback, it is one of two normal cases. The
 * data can carry media per turn the day the first one is filmed, and nothing
 * else in the loop changes.
 *
 * The element is owned by the caller: replying mid-sentence has to be able to
 * stop them talking.
 */
export default function BeatStage({
  turn,
  videoRef,
  onEnded,
  onUnavailable,
}: {
  turn: Turn;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onEnded: () => void;
  onUnavailable: () => void;
}) {
  const replay = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    void video.play().catch(() => undefined);
  };

  return (
    <div className="stage">
      <video
        ref={videoRef}
        className="beat-video"
        src={turn.videoUrl}
        poster={turn.posterUrl}
        controls
        playsInline
        onEnded={onEnded}
        // No clip on disk yet, or a codec this browser won't take.
        onError={onUnavailable}
      />
      <div className="stage-actions">
        <button className="quiet-button" onClick={replay}>
          ↺ Play again
        </button>
      </div>
    </div>
  );
}
