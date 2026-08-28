import React from 'react';
import { Beat } from '../types';

/**
 * The speaker's clip. Rendered only when there is video to play — a written
 * beat (or a clip that won't load) puts her words straight into the transcript
 * instead, so her line is never on screen in two places at once.
 *
 * The element is owned by the caller: replying mid-sentence has to be able to
 * stop her talking.
 */
export default function BeatStage({
  beat,
  videoRef,
  onEnded,
  onUnavailable,
}: {
  beat: Beat;
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
        src={beat.videoUrl}
        poster={beat.posterUrl}
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
