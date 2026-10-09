/**
 * Radix DropdownMenu / Select / Dialog (via react-remove-scroll) can leave
 * `pointer-events: none` on <body> after close, freezing the UI. Clear it
 * immediately and again after remove-scroll's deferred cleanup.
 */
export function releasePointerEvents(): void {
  if (typeof document === 'undefined') return;

  const unlock = () => {
    document.body.style.pointerEvents = '';
    document.documentElement.style.pointerEvents = '';
  };

  unlock();
  window.setTimeout(unlock, 0);
  window.setTimeout(unlock, 250);
}
