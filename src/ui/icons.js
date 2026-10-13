/** Iconos SVG en línea. */

export const IC=p=>`<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;

export const ICON={
  down:IC('<path d="M12 5v14M6 13l6 6 6-6"/>'),
  up:IC('<path d="M12 19V5M6 11l6-6 6 6"/>'),
  card:IC('<rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M2.5 10h19"/>'),
  check:IC('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  set:IC('<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>'),
  search:IC('<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4-4"/>')
};
