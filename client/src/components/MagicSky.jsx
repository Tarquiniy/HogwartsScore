import '../styles/sky.css';

// Backdrop: a dark room with one soft warm light from above, a few faint stars
// near the top and a little film grain. Nothing here moves.

function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Many stars as one element: each box-shadow is a star. */
function starField(count, seed) {
  const next = seeded(seed);
  return Array.from({ length: count }, () => {
    const x = (next() * 100).toFixed(2);
    const y = (next() * 62).toFixed(2);
    const alpha = (0.3 + next() * 0.5).toFixed(2);
    return `${x}vw ${y}vh 0 0 rgba(236, 230, 216, ${alpha})`;
  }).join(', ');
}

const STARS = starField(90, 7);

export default function MagicSky() {
  return (
    <div className="sky" aria-hidden="true">
      <div className="sky__light" />
      <div className="sky__stars-fade">
        <div className="sky__stars" style={{ boxShadow: STARS }} />
      </div>
      <div className="sky__vignette" />
      <div className="sky__grain" />
    </div>
  );
}
