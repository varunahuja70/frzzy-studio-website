'use client';

import { useState, useEffect, useRef } from 'react';

interface ProtectedMediaState {
  blobUrl: string | null;
  loading: boolean;
  error: boolean;
  mediaType?: 'video' | 'image';
}

/**
 * Hook to stream media securely via ephemeral signed tokens and local Blob URLs.
 * Eliminates direct, permanent media URLs in the client DOM.
 * Cleans up Object URLs on component unmount to prevent memory leaks.
 */
export function useProtectedMedia(slotId: string, fallbackUrl?: string) {
  const [state, setState] = useState<ProtectedMediaState>({
    blobUrl: null,
    loading: true,
    error: false,
  });

  const activeBlobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const loadMedia = async () => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: false }));

        // 1. Request short-lived signed media token
        const tokenRes = await fetch('/api/media/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slot: slotId }),
        });

        if (!tokenRes.ok) {
          throw new Error(`Token request failed with status ${tokenRes.status}`);
        }

        const tokenData = await tokenRes.json();
        const streamUrl: string = tokenData.streamUrl;

        // 2. Fetch media stream and create in-memory blob URL
        const mediaRes = await fetch(streamUrl);
        if (!mediaRes.ok) {
          throw new Error(`Media stream failed with status ${mediaRes.status}`);
        }

        const blob = await mediaRes.blob();
        if (isCancelled) return;

        const objectUrl = URL.createObjectURL(blob);
        activeBlobUrlRef.current = objectUrl;

        setState({
          blobUrl: objectUrl,
          loading: false,
          error: false,
          mediaType: tokenData.mediaType,
        });
      } catch {
        if (!isCancelled) {
          // Graceful fallback to fallback URL if present
          setState({
            blobUrl: fallbackUrl || null,
            loading: false,
            error: true,
          });
        }
      }
    };

    loadMedia();

    return () => {
      isCancelled = true;
      if (activeBlobUrlRef.current) {
        URL.revokeObjectURL(activeBlobUrlRef.current);
        activeBlobUrlRef.current = null;
      }
    };
  }, [slotId, fallbackUrl]);

  return {
    src: state.blobUrl || fallbackUrl || '',
    loading: state.loading,
    error: state.error,
    mediaType: state.mediaType,
    // Deterrent event handlers for media elements
    protectionProps: {
      onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
      onDragStart: (e: React.DragEvent) => e.preventDefault(),
      controlsList: 'nodownload noremoteplayback',
      disablePictureInPicture: true,
    },
  };
}
