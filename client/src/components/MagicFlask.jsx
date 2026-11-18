import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { FILL_DURATION_MS, easeOutCubic } from '../constants';
import '../styles/flask.css';

const ASSET_VERSION = 201;

function hexToRgb(hex) {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function mix(a, b, t) {
  const k = Math.max(0, Math.min(1, t));
  return [
    a[0] + (b[0] - a[0]) * k,
    a[1] + (b[1] - a[1]) * k,
    a[2] + (b[2] - a[2]) * k,
  ];
}

// Deterministic per-pixel jitter so the sand reads as grains, not flat paint.
function grain(x, y) {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

/**
 * Pixel size the sand canvas needs: the mask is drawn at 800 px wide, the flask
 * is shown about 200 CSS px wide, so painting the full mask wastes most of the work.
 */
function canvasScale(img, canvas) {
  const cssWidth = canvas?.getBoundingClientRect().width || 200;
  const dpr = window.devicePixelRatio || 1;
  const wanted = Math.ceil(cssWidth * dpr);
  return Math.max(0.25, Math.min(1, wanted / img.naturalWidth));
}

/** Read the mask's luminance into a coverage map plus per-row spans. */
function readMask(img, scale) {
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  const ctx = off.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);

  const coverage = new Uint8Array(w * h);
  const spans = new Int32Array(h * 2).fill(-1);
  const rowArea = new Float64Array(h);

  for (let y = 0; y < h; y += 1) {
    let first = -1;
    let last = -1;
    let area = 0;
    for (let x = 0; x < w; x += 1) {
      const c = data[(y * w + x) * 4];
      coverage[y * w + x] = c;
      if (c > 6) {
        if (first < 0) first = x;
        last = x;
        area += c / 255;
      }
    }
    spans[y * 2] = first;
    spans[y * 2 + 1] = last;
    rowArea[y] = area;
  }

  // Cumulative area measured from the floor upwards, so a given score fills the
  // volume of the bottle rather than a flat share of its height.
  const cumulative = new Float64Array(h);
  let running = 0;
  for (let y = h - 1; y >= 0; y -= 1) {
    running += rowArea[y];
    cumulative[y] = running;
  }

  let top = 0;
  while (top < h && rowArea[top] <= 0) top += 1;
  let bottom = h - 1;
  while (bottom > top && rowArea[bottom] <= 0) bottom -= 1;

  // Where falling sand enters: the middle of the cavity's upper rows.
  let streamSum = 0;
  let streamRows = 0;
  const neckEnd = Math.min(bottom, top + Math.max(2, Math.round((bottom - top) * 0.12)));
  for (let y = top; y <= neckEnd; y += 1) {
    if (spans[y * 2] < 0) continue;
    streamSum += (spans[y * 2] + spans[y * 2 + 1]) / 2;
    streamRows += 1;
  }
  const streamX = streamRows ? Math.round(streamSum / streamRows) : Math.round(w / 2);

  return {
    w, h, scale, coverage, spans, cumulative, total: running, top, bottom, streamX,
  };
}

function levelForFill(mask, fill) {
  if (fill <= 0.0005) return mask.bottom + 1;
  if (fill >= 0.9995) return mask.top;
  const target = mask.total * fill;
  for (let y = mask.bottom; y >= mask.top; y -= 1) {
    if (mask.cumulative[y] >= target) return y;
  }
  return mask.top;
}

function paint(ctx, image, mask, level, colors, phase, pour = 0, now = 0) {
  const { w, coverage, spans, scale } = mask;
  const out = image.data;
  // One buffer per flask, cleared in place: allocating a fresh frame each time
  // churned megabytes per second through the garbage collector.
  out.fill(0);

  if (level <= mask.bottom) {
    const light = hexToRgb(colors.light);
    const core = hexToRgb(colors.core);
    const deep = hexToRgb(colors.deep);
    const depth = Math.max(1, mask.bottom - level);
    // Wave and grain are tuned in full-size mask pixels; map back to them so the
    // look does not depend on how small the canvas is.
    const inv = 1 / scale;

    for (let y = level; y <= mask.bottom; y += 1) {
      const x0 = spans[y * 2];
      const x1 = spans[y * 2 + 1];
      if (x0 < 0) continue;

      const t = (y - level) / depth;
      // Only a thin band under the surface is pale. With the pale tone running
      // 40 % of the depth, a full flask looked like tinted glass, not contents.
      const base = t < 0.16
        ? mix(light, core, t / 0.16)
        : mix(core, deep, ((t - 0.16) / 0.84) * 0.8);
      const row = y * w;
      const yo = y * inv;
      const levelO = level * inv;

      for (let x = x0; x <= x1; x += 1) {
        const cov = coverage[row + x];
        if (cov <= 6) continue;

        const xo = x * inv;
        // Surface crest: a soft lit band that follows a gentle wave.
        const surface = Math.max(
          0,
          1 - Math.abs(yo - (levelO + Math.sin(xo * 0.03 + phase) * 1.8)) / 5,
        );
        const g = grain(x, y);
        const jitter = (g - 0.5) * 26 + (g > 0.93 ? -20 : g < 0.07 ? 16 : 0);
        // The house hourglasses hold gems, not sand: a few grains catch the light.
        const glint = g > 0.9905 ? 78 : 0;
        const lift = surface * 42 + glint;

        const i = (row + x) * 4;
        out[i] = Math.max(0, Math.min(255, base[0] + jitter + lift));
        out[i + 1] = Math.max(0, Math.min(255, base[1] + jitter * 0.85 + lift * 0.9));
        out[i + 2] = Math.max(0, Math.min(255, base[2] + jitter * 0.7 + lift * 0.7));
        out[i + 3] = cov;
      }
    }
  }

  // While points are being added, a thin stream of grains falls from the top of
  // the cavity down to the surface, like a real hourglass.
  if (pour > 0 && level > mask.top) {
    const light = hexToRgb(colors.light);
    const half = Math.max(1, Math.round(3 * scale));
    const fall = Math.floor(now * 0.45 * Math.max(0.4, scale));
    const end = Math.min(level, mask.bottom);

    for (let y = mask.top; y < end; y += 1) {
      const row = y * w;
      for (let dx = -half; dx <= half; dx += 1) {
        const x = mask.streamX + dx;
        if (x < 0 || x >= w) continue;
        const cov = coverage[row + x];
        if (cov <= 6) continue;

        const g = grain(x, y - fall);
        const edge = 1 - (Math.abs(dx) / (half + 1)) * 0.7;
        const alpha = cov * pour * edge * (g > 0.4 ? 1 : 0.22);
        const i = (row + x) * 4;
        if (alpha <= out[i + 3]) continue;

        const spark = g > 0.9 ? 60 : 24;
        out[i] = Math.min(255, light[0] + spark);
        out[i + 1] = Math.min(255, light[1] + spark);
        out[i + 2] = Math.min(255, light[2] + spark);
        out[i + 3] = alpha;
      }
    }
  }

  ctx.putImageData(image, 0, 0);
}

export default function MagicFlask({
  houseId, fillPercent, flask, isLeader, glintKey = 0,
}) {
  const reduced = useReducedMotion();
  const canvasRef = useRef(null);
  const coatRef = useRef(null);
  const maskRef = useRef(null);
  const frameRef = useRef(0);
  const currentRef = useRef(0);
  const targetRef = useRef(0);
  const wakeRef = useRef(() => {});
  const [ready, setReady] = useState(false);

  targetRef.current = Math.max(0, Math.min(100, Number(fillPercent) || 0)) / 100;

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    maskRef.current = null;

    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      if (cancelled) return;
      maskRef.current = readMask(img, canvasScale(img, canvasRef.current));
      if (maskRef.current) setReady(true);
    };
    img.src = `/flasks/${houseId}-mask.png?v=${ASSET_VERSION}`;

    return () => { cancelled = true; };
  }, [houseId]);

  useEffect(() => {
    if (!ready || !maskRef.current) return undefined;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return undefined;

    const mask = maskRef.current;
    canvas.width = mask.w;
    canvas.height = mask.h;
    const image = ctx.createImageData(mask.w, mask.h);
    const colors = flask.sand;
    // Optional copy of the sand drawn over the glass (see `coat` in constants).
    const coat = coatRef.current;
    const coatCtx = coat ? coat.getContext('2d') : null;
    if (coat) {
      coat.width = mask.w;
      coat.height = mask.h;
    }

    let running = false;
    let lastLevel = -1;
    // A fixed-length tween from wherever the sand is now: the old per-frame easing
    // got 90 % of the way in half a second and then crawled for another second.
    let from = currentRef.current;
    let to = targetRef.current;
    let start = performance.now();

    const step = (now = performance.now()) => {
      const target = targetRef.current;
      if (target !== to) {
        from = currentRef.current;
        to = target;
        start = now;
      }
      const t = reduced ? 1 : Math.min(1, Math.max(0, (now - start) / FILL_DURATION_MS));
      currentRef.current = from + (to - from) * easeOutCubic(t);
      const settled = t >= 1;

      const level = levelForFill(mask, currentRef.current);
      const phase = reduced ? 0 : now * 0.0016;
      // The stream runs only while the sand rises, and thins out as it arrives.
      const pour = !settled && to > from ? Math.min(1, (1 - t) * 2.4) : 0;

      // While moving the crest ripples every frame; at rest the last frame stays.
      if (!settled || level !== lastLevel) {
        paint(ctx, image, mask, level, colors, phase, pour, now);
        if (coatCtx) coatCtx.putImageData(image, 0, 0);
        lastLevel = level;
      }

      if (settled) {
        running = false;
        return;
      }
      frameRef.current = requestAnimationFrame(step);
    };

    const wake = () => {
      if (running) return;
      running = true;
      frameRef.current = requestAnimationFrame(step);
    };

    wakeRef.current = wake;
    lastLevel = -1;
    running = true;
    step(performance.now());

    return () => {
      running = false;
      wakeRef.current = () => {};
      cancelAnimationFrame(frameRef.current);
    };
  }, [ready, flask, reduced, houseId]);

  // A new score restarts the loop only if it went to sleep.
  useEffect(() => {
    wakeRef.current();
  }, [fillPercent]);

  return (
    <div
      className={`flask flask--${houseId} ${isLeader ? 'flask--leader' : ''}`}
    >
      <div className="magic-flask__stage">
        <canvas ref={canvasRef} className="magic-flask__canvas" aria-hidden="true" />
        <img
          src={`/flasks/${houseId}.png?v=${ASSET_VERSION}`}
          alt=""
          className="magic-flask__img"
          draggable={false}
          loading="eager"
        />
        {flask.coat ? (
          <canvas
            ref={coatRef}
            className="magic-flask__coat"
            style={{ opacity: flask.coat }}
            aria-hidden="true"
          />
        ) : null}
        {/* One glint across the glass each time points arrive; still otherwise. */}
        <span
          key={glintKey}
          className={`magic-flask__shine ${glintKey ? 'magic-flask__shine--run' : ''}`}
          aria-hidden="true"
          style={{
            WebkitMaskImage: `url(/flasks/${houseId}.png?v=${ASSET_VERSION})`,
            maskImage: `url(/flasks/${houseId}.png?v=${ASSET_VERSION})`,
          }}
        />
      </div>
    </div>
  );
}
