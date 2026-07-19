import { useEffect, useRef } from 'react';

/**
 * Soft radial glow that follows the cursor (uses the .cursor-glow CSS
 * already defined in index.html). Intensity ramps up while the cursor
 * is actively moving and gently fades back down when it stops, so the
 * light genuinely feels alive instead of a static blob.
 */
export default function CursorGlow() {
  const decayTimer = useRef(null);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--glow-o', '0.05');

    function handleMove(e) {
      root.style.setProperty('--mx', `${e.clientX}px`);
      root.style.setProperty('--my', `${e.clientY}px`);
      root.style.setProperty('--glow-o', '0.18');

      clearTimeout(decayTimer.current);
      decayTimer.current = setTimeout(() => {
        root.style.setProperty('--glow-o', '0.05');
      }, 450);
    }

    function handleLeave() {
      root.style.setProperty('--glow-o', '0');
    }

    window.addEventListener('mousemove', handleMove, { passive: true });
    window.addEventListener('mouseleave', handleLeave);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseleave', handleLeave);
      clearTimeout(decayTimer.current);
    };
  }, []);

  return <div className="cursor-glow" aria-hidden="true" />;
}
