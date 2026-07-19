import { useEffect } from 'react';

// Single shared IntersectionObserver for the whole app.
let observer = null;
function getObserver() {
  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
    );
  }
  return observer;
}

/**
 * Scans the DOM for any ".reveal" element that isn't being watched yet
 * and hooks it up to the shared observer. Cards/sections then fade + rise
 * into view as the user scrolls past them, instead of just popping in.
 *
 * Call this inside a component that re-renders whenever new content
 * (e.g. async-loaded cards) is added to the page.
 */
export function useScrollReveal(deps = []) {
  useEffect(() => {
    const obs = getObserver();
    const els = document.querySelectorAll('.reveal:not([data-reveal-bound])');
    els.forEach((el, i) => {
      el.setAttribute('data-reveal-bound', 'true');
      el.style.transitionDelay = `${Math.min(i * 45, 300)}ms`;
      obs.observe(el);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
