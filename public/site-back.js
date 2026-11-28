(() => {
  const back = document.querySelector('.site-back-button');
  if (!back || history.length < 2 || !document.referrer.startsWith(location.origin + '/')) return;

  back.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    history.back();
  });
})();
