'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Match } from '@/types';

export function usePiPScoreboard() {
  const [isPiPActive, setIsPiPActive] = useState(false);
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'documentPictureInPicture' in window) {
      setIsSupported(true);
    }
  }, []);

  const openPiP = useCallback(async (containerId: string) => {
    if (typeof window === 'undefined') return;

    if ('documentPictureInPicture' in window) {
      try {
        // @ts-ignore
        const pipWin = await window.documentPictureInPicture.requestWindow({
          width: 380,
          height: 240,
        });

        // Copy styles
        Array.from(document.styleSheets).forEach((styleSheet) => {
          try {
            const cssRules = Array.from(styleSheet.cssRules)
              .map((rule) => rule.cssText)
              .join('');
            const style = document.createElement('style');
            style.textContent = cssRules;
            pipWin.document.head.appendChild(style);
          } catch (e) {
            const link = document.createElement('link');
            if (styleSheet.href) {
              link.rel = 'stylesheet';
              link.type = styleSheet.type;
              link.media = styleSheet.media.toString();
              link.href = styleSheet.href;
              pipWin.document.head.appendChild(link);
            }
          }
        });

        // Set PiP body style
        pipWin.document.body.style.margin = '0';
        pipWin.document.body.style.backgroundColor = '#0B0E14';
        pipWin.document.body.style.color = '#FFFFFF';
        pipWin.document.body.style.overflow = 'hidden';

        const sourceEl = document.getElementById(containerId);
        if (sourceEl) {
          const clone = sourceEl.cloneNode(true) as HTMLElement;
          clone.id = 'pip-scoreboard-root';
          pipWin.document.body.appendChild(clone);
        }

        pipWin.addEventListener('pagehide', () => {
          setIsPiPActive(false);
          setPipWindow(null);
        });

        setPipWindow(pipWin);
        setIsPiPActive(true);
        return;
      } catch (err) {
        console.warn('Document PiP request failed, using floating overlay fallback:', err);
      }
    }

    // Fallback: floating overlay inside DOM
    setIsPiPActive(true);
  }, []);

  const closePiP = useCallback(() => {
    if (pipWindow) {
      pipWindow.close();
      setPipWindow(null);
    }
    setIsPiPActive(false);
  }, [pipWindow]);

  return {
    isPiPActive,
    isSupported,
    openPiP,
    closePiP,
    pipWindow,
  };
}
