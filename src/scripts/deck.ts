const deck = document.querySelector<HTMLElement>('#deck');
if (!deck) throw new Error('missing deck');

const pages = () => [...deck.querySelectorAll<HTMLElement>(':scope > .page')];

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function nearest() {
  const top = deck!.scrollTop;
  let best = pages()[0];
  let bestDist = Number.POSITIVE_INFINITY;
  for (const page of pages()) {
    const dist = Math.abs(page.offsetTop - top);
    if (dist < bestDist) {
      best = page;
      bestDist = dist;
    }
  }
  return best;
}

const armed = new WeakMap<HTMLElement, boolean>();

function play(page: HTMLElement) {
  page.classList.remove('is-playing');
  if (!reduced) void page.offsetWidth;
  page.classList.add('is-playing');
}

const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      const page = entry.target as HTMLElement;
      if (entry.intersectionRatio >= 0.72 && !armed.get(page)) {
        armed.set(page, true);
        play(page);
      }
      if (entry.intersectionRatio <= 0.15) armed.set(page, false);
    }
  },
  { root: deck, threshold: [0.15, 0.72] },
);

document.documentElement.classList.add('deck-ready');
for (const page of pages()) observer.observe(page);

function canScroll(el: HTMLElement, dy: number) {
  const overflow = getComputedStyle(el).overflowY;
  if (overflow !== 'auto' && overflow !== 'scroll') return false;
  if (el.scrollHeight <= el.clientHeight + 64) return false;
  if (dy > 0) return el.scrollTop + el.clientHeight < el.scrollHeight - 2;
  return el.scrollTop > 2;
}

function go(page: HTMLElement | undefined) {
  if (!page) return;
  deck!.scrollTo({ top: page.offsetTop, behavior: reduced ? 'auto' : 'smooth' });
}

let lockedUntil = 0;
deck.addEventListener(
  'wheel',
  (event) => {
    const page = nearest();
    const inner = page.querySelector<HTMLElement>('.wrap');
    if (inner && canScroll(inner, event.deltaY)) return;
    event.preventDefault();
    if (Math.abs(event.deltaY) < 8) return;
    const now = performance.now();
    if (now < lockedUntil) return;
    lockedUntil = now + 900;
    const list = pages();
    const index = list.indexOf(page);
    go(list[index + (event.deltaY > 0 ? 1 : -1)]);
  },
  { passive: false },
);

document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (event) => {
    const id = link.getAttribute('href')?.slice(1);
    if (!id) return;
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    const page = target.classList.contains('page') ? target : target.closest<HTMLElement>('.page');
    go(page ?? undefined);
  });
});

window.addEventListener('keydown', (event) => {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && event.key !== 'PageDown' && event.key !== 'PageUp') {
    return;
  }
  const tag = (event.target as HTMLElement | null)?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  event.preventDefault();
  const list = pages();
  const index = list.indexOf(nearest());
  const dir = event.key === 'ArrowDown' || event.key === 'PageDown' ? 1 : -1;
  go(list[index + dir]);
});
