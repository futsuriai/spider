'use strict';

// Court card portraits (Jack, Queen, King). Each is a half-length figure in a robe
// that takes the suit colour through currentColor, with gold trim and a headpiece.
const COURT_ART = (() => {
  const robe = (d) => `<path d="${d}" fill="currentColor"/>`;
  const trim = `<path d="M36,92 L50,112 L64,92" fill="none" stroke="#d9b25f" stroke-width="3.5" stroke-linejoin="round"/>`;
  const neck = `<path d="M44,76 L44,93 L56,93 L56,76 Z" fill="#e9bb93"/>`;
  const face = `<ellipse cx="50" cy="62" rx="14" ry="17" fill="#f2c9a3" stroke="#7a4b2e" stroke-width="0.8"/>`;
  const features =
    `<ellipse cx="44.5" cy="61" rx="1.7" ry="1.2" fill="#2b1d16"/>` +
    `<ellipse cx="55.5" cy="61" rx="1.7" ry="1.2" fill="#2b1d16"/>` +
    `<path d="M41,56 Q44.5,54 48,56 M52,56 Q55.5,54 59,56" stroke="#4a2e1c" stroke-width="1" fill="none"/>` +
    `<path d="M50,61 L48.5,68 L51.5,68" fill="none" stroke="#9a6642" stroke-width="0.8"/>` +
    `<path d="M45.5,73 Q50,76 54.5,73" fill="none" stroke="#9c4a3a" stroke-width="1.1" stroke-linecap="round"/>`;
  const svg = (body) => `<svg viewBox="12 12 76 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${body}</svg>`;

  // Jack: a flat cap with a feather, short hair, no beard.
  const jack = svg(
    robe('M14,140 C14,112 22,98 36,92 L64,92 C78,98 86,112 86,140 Z') +
      trim +
      neck +
      `<path d="M37,58 Q37,46 50,46 Q63,46 63,58 Q58,50 50,50 Q42,50 37,58 Z" fill="#5b3a24"/>` +
      face +
      features +
      `<path d="M30,50 Q32,30 50,30 Q68,30 70,50 Z" fill="#d9b25f" stroke="#8a6526" stroke-width="0.8"/>` +
      `<rect x="30" y="47.5" width="40" height="5" fill="currentColor"/>` +
      `<path d="M62,36 Q80,14 86,30 Q78,26 66,40 Z" fill="#b3202b"/>`,
  );

  // Queen: long hair falling to the shoulders, a jewelled tiara, pearls at the neck.
  const queen = svg(
    `<path d="M34,62 Q31,34 50,33 Q69,34 66,62 L66,86 Q58,82 50,86 Q42,82 34,86 Z" fill="#5b3a24"/>` +
      robe('M14,140 C14,112 22,98 36,92 L64,92 C78,98 86,112 86,140 Z') +
      trim +
      neck +
      face +
      features +
      `<path d="M38,40 L41,30 L46,37 L50,27 L54,37 L59,30 L62,40 Z" fill="#d9b25f" stroke="#8a6526" stroke-width="0.8"/>` +
      `<circle cx="50" cy="33.5" r="1.5" fill="#2f7f6f"/>` +
      [38, 44, 50, 56, 62].map((x) => `<circle cx="${x}" cy="97" r="1.3" fill="#f6f1e4"/>`).join(''),
  );

  // King: a gold crown with red jewels, grey hair and a full beard.
  const king = svg(
    robe('M14,140 C14,112 22,98 36,92 L64,92 C78,98 86,112 86,140 Z') +
      trim +
      neck +
      `<path d="M37,66 Q37,85 50,85 Q63,85 63,66 Q60,77 50,77 Q40,77 37,66 Z" fill="#8c8580"/>` +
      face +
      features +
      `<path d="M36,56 Q36,40 50,40 Q64,40 64,56 Q60,46 50,46 Q40,46 36,56 Z" fill="#8c8580"/>` +
      `<path d="M35,44 L38,26 L44,36 L50,22 L56,36 L62,26 L65,44 Z" fill="#d9b25f" stroke="#8a6526" stroke-width="0.9"/>` +
      `<rect x="34" y="41" width="32" height="4.5" fill="#c9a24e" stroke="#8a6526" stroke-width="0.6"/>` +
      [[38, 26], [50, 22], [62, 26]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.7" fill="#b3202b"/>`).join(''),
  );

  return { 11: jack, 12: queen, 13: king };
})();
