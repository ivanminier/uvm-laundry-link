import { useEffect, useId, useRef } from 'react';

const PROMPT_SEEN_KEY = 'uvmLaundryHomeScreenPromptSeen';

export function HomeScreenSteps() {
  return (
    <ol className="ml-5 list-decimal space-y-1">
      <li>Open UVMLaundry.com in Safari.</li>
      <li>Tap <strong>Share</strong>. If needed, open the page menu first.</li>
      <li>Choose <strong>Add to Home Screen</strong>. Tap <strong>View More</strong> if you don’t see it.</li>
      <li>Turn on <strong>Open as Web App</strong> if shown, then tap <strong>Add</strong>.</li>
    </ol>
  );
}

export function HomeScreenPrompt() {
  const dialog = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const installed = navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;

    if (!ios || installed || typeof dialog.current?.showModal !== 'function') return;

    try {
      if (localStorage.getItem(PROMPT_SEEN_KEY) === '1') return;
    } catch {
      // The prompt can still open if storage is unavailable.
    }

    dialog.current.showModal();
    try {
      localStorage.setItem(PROMPT_SEEN_KEY, '1');
    } catch {
      // Dismissal still works for this visit.
    }
  }, []);

  return (
    <dialog ref={dialog} aria-labelledby={titleId}
      className="ll-dialog w-[calc(100%-2rem)] max-w-md rounded-xl p-5 shadow-xl sm:p-6">
      <h2 id={titleId} className="text-xl font-bold">Add LaundryLink to your Home Screen</h2>
      <p className="mb-4 mt-2 text-sm text-slate-600 dark:text-slate-300">Open your laundry tracker right from the icon.</p>
      <div className="text-sm"><HomeScreenSteps /></div>
      <form method="dialog" className="mt-5 flex justify-end">
        <button type="submit" className="ll-back-button">Got it</button>
      </form>
    </dialog>
  );
}
