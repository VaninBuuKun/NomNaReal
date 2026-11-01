import React, { useEffect, useRef } from 'react';

interface VideoPlayerProps {
  stream: MediaStream | null;
  className?: string;
}

/**
 * Isolated <video> for a MediaStream.
 * Always muted (remote audio plays through a dedicated <audio>) and explicitly calls play(),
 * because assigning srcObject does not re-trigger autoplay in Chromium/Safari (→ black frame).
 */
export const VideoPlayer: React.FC<VideoPlayerProps> = ({ stream, className = 'w-full h-full object-cover' }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    if (el.srcObject !== stream) el.srcObject = stream;
    if (!stream) return;

    el.muted = true;
    el.playsInline = true;

    const play = () => {
      el.play().catch(() => {
        // Waiting for the first decoded frame / interrupted by a new load — retried on next event
      });
    };

    play();
    el.addEventListener('loadedmetadata', play);
    el.addEventListener('resize', play);
    stream.addEventListener('addtrack', play);

    return () => {
      el.removeEventListener('loadedmetadata', play);
      el.removeEventListener('resize', play);
      stream.removeEventListener('addtrack', play);
    };
  }, [stream]);

  return <video ref={videoRef} autoPlay playsInline muted className={className} />;
};
