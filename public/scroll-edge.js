// Safari can reveal the document background during elastic scrolling.
(() => {
  const root = document.documentElement;
  function updateScrollEdge() {
    root.toggleAttribute('data-at-top', window.scrollY <= 0);
  }
  window.addEventListener('scroll', updateScrollEdge, { passive: true });
  window.addEventListener('pageshow', updateScrollEdge);
  updateScrollEdge();
})();
