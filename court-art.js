'use strict';

// Court card portraits (Jack, Queen, King). Each is a half-length figure in an engraved
// style: a patterned robe with an ermine collar, a shaded face and distinct headwear.
// The robe takes the suit colour through currentColor. Shapes stay bold so each figure
// still reads at card size.
const COURT_ART = (() => {
  const gold = '#c9a24e';
  const ink = '#2b2420';

  const defs = (id) =>
    `<defs>` +
    `<linearGradient id="${id}-skin" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="#f7dcbc"/><stop offset="1" stop-color="#dd9f72"/></linearGradient>` +
    `<pattern id="${id}-robe" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">` +
    `<rect width="6" height="6" fill="currentColor"/><rect width="2.2" height="2.2" fill="#f3e3b5" opacity="0.5"/></pattern>` +
    `<pattern id="${id}-ermine" width="7" height="7" patternUnits="userSpaceOnUse">` +
    `<rect width="7" height="7" fill="#f7f1e1"/><path d="M3.5,1 v3 M2,2.5 h3" stroke="${ink}" stroke-width="0.9"/></pattern>` +
    `</defs>`;

  const shoulders = (id) =>
    `<path d="M12,140 C12,112 20,98 35,91 L65,91 C80,98 88,112 88,140 Z" fill="url(#${id}-robe)" stroke="#3b1b1b" stroke-width="0.6"/>`;
  const ermine = (id) => `<path d="M31,92 Q50,102 69,92 L72,100 Q50,112 28,100 Z" fill="url(#${id}-ermine)"/>`;
  const neck = (id) => `<path d="M44,75 L44,92 Q50,96 56,92 L56,75 Z" fill="url(#${id}-skin)" stroke="#8a5a3c" stroke-width="0.5"/>`;

  const face = (id) =>
    `<path d="M36,56 Q36,40 50,40 Q64,40 64,56 Q64,76 50,80 Q36,76 36,56 Z" fill="url(#${id}-skin)" stroke="#7a4b2e" stroke-width="0.7"/>`;

  const features = (brow) =>
    `<path d="M40,60 Q44,57.5 48,60 Q44,61.8 40,60 Z M52,60 Q56,57.5 60,60 Q56,61.8 52,60 Z" fill="#fff9ef" stroke="#4a2e1c" stroke-width="0.6"/>` +
    `<circle cx="44" cy="60" r="0.9" fill="#3b2418"/><circle cx="56" cy="60" r="0.9" fill="#3b2418"/>` +
    `<path d="M40,55.5 Q44,53.5 48,55.5 M52,55.5 Q56,53.5 60,55.5" fill="none" stroke="${brow}" stroke-width="1.1" stroke-linecap="round"/>` +
    `<path d="M50,60 Q48.5,67 50.5,68 Q52,68 51.5,67" fill="none" stroke="#8a5a3c" stroke-width="0.7"/>` +
    `<path d="M45,73.5 Q50,75.8 55,73.5 Q50,72.8 45,73.5 Z" fill="#a4483a" stroke="#6b2b22" stroke-width="0.4"/>` +
    `<path d="M57,64 l-3,5 M59,68 l-3,4" stroke="#8a5a3c" stroke-width="0.5" opacity="0.7"/>`;

  const svg = (id, body) =>
    `<svg viewBox="12 12 76 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${defs(id)}${body}</svg>`;

  // Jack: a gold cap with a black band and a red plume, short hair.
  const jack = (() => {
    const id = 'jk';
    return svg(
      id,
      shoulders(id) +
        ermine(id) +
        neck(id) +
        `<path d="M36,58 Q35,44 50,44 Q65,44 64,58 Q60,50 50,49 Q41,50 36,58 Z" fill="#4a2e1c"/>` +
        face(id) +
        features('#4a2e1c') +
        `<path d="M29,49 Q31,31 50,31 Q69,31 71,49 Z" fill="${gold}" stroke="#6b4e1c" stroke-width="0.7"/>` +
        `<path d="M30,47 L70,47 L70,52 L30,52 Z" fill="${ink}"/>` +
        `<path d="M64,38 Q82,18 88,30 Q78,30 66,42 Z" fill="#a52a33" stroke="#5e1218" stroke-width="0.5"/>`,
    );
  })();

  // Queen: flowing hair, a jewelled tiara and a pearl necklace.
  const queen = (() => {
    const id = 'qn';
    return svg(
      id,
      `<path d="M33,62 Q29,32 50,31 Q71,32 67,62 L68,90 Q58,85 50,89 Q42,85 32,90 Z" fill="#4a2e1c" stroke="#2b1a10" stroke-width="0.5"/>` +
        shoulders(id) +
        ermine(id) +
        neck(id) +
        face(id) +
        features('#4a2e1c') +
        `<path d="M38,42 L40,30 L46,37 L50,27 L54,37 L60,30 L62,42 Z" fill="${gold}" stroke="#6b4e1c" stroke-width="0.6"/>` +
        `<circle cx="50" cy="34.5" r="1.6" fill="#2f7f6f" stroke="#1d4a42" stroke-width="0.3"/>` +
        [40, 45, 50, 55, 60].map((x) => `<circle cx="${x}" cy="97" r="1.2" fill="#f8f3e6" stroke="#9c8f72" stroke-width="0.3"/>`).join(''),
    );
  })();

  // King: a Gothic crown with arches and red jewels, grey hair and a forked beard.
  const king = (() => {
    const id = 'kg';
    return svg(
      id,
      shoulders(id) +
        ermine(id) +
        neck(id) +
        `<path d="M37,70 Q36,86 50,88 Q64,86 63,70 Q60,80 50,81 Q40,80 37,70 Z" fill="#9b9088" stroke="#5f554e" stroke-width="0.5"/>` +
        face(id) +
        features('#8c8580') +
        `<path d="M36,56 Q35,39 50,39 Q65,39 64,56 Q61,46 50,46 Q39,46 36,56 Z" fill="#9b9088" stroke="#5f554e" stroke-width="0.5"/>` +
        `<path d="M35,44 L35,33 Q42,28 42,36 Q44,22 50,20 Q56,22 58,36 Q58,28 65,33 L65,44 Z" fill="${gold}" stroke="#6b4e1c" stroke-width="0.7"/>` +
        `<rect x="34" y="42" width="32" height="4" fill="#b8913f" stroke="#6b4e1c" stroke-width="0.5"/>` +
        [[41, 35], [50, 27], [59, 35]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.8" fill="#b3202b" stroke="#5e1218" stroke-width="0.3"/>`).join(''),
    );
  })();

  return { 11: jack, 12: queen, 13: king };
})();
