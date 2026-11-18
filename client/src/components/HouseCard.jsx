import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { HOUSE_META, FILL_DURATION_MS, easeOutCubic } from '../constants';
import MagicFlask from './MagicFlask';
import { CrownIcon } from './Icons';
import '../styles/house-card.css';
import '../styles/flask.css';

/** Counts the shown number towards `value` in step with the sand. */
function useCountUp(value, reduced) {
  const [shown, setShown] = useState(value);
  const shownRef = useRef(value);

  useEffect(() => {
    if (reduced) {
      shownRef.current = value;
      setShown(value);
      return undefined;
    }

    const from = shownRef.current;
    if (from === value) return undefined;
    const start = performance.now();
    let frame = 0;

    const tick = (now) => {
      const t = Math.min(1, Math.max(0, (now - start) / FILL_DURATION_MS));
      const next = Math.round(from + (value - from) * easeOutCubic(t));
      if (next !== shownRef.current) {
        shownRef.current = next;
        setShown(next);
      }
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, reduced]);

  return shown;
}

/**
 * Remembers each real score change so the card can answer it. The first value a
 * card learns about (page load) is not a change.
 */
function useScoreChanges(score, known) {
  const [changes, setChanges] = useState([]);
  const prevRef = useRef(known ? score : null);
  const idRef = useRef(0);

  useEffect(() => {
    if (!known) return;
    const prev = prevRef.current;
    prevRef.current = score;
    if (prev === null || prev === score) return;

    idRef.current += 1;
    const change = { id: idRef.current, delta: score - prev };
    setChanges((list) => [...list.slice(-2), change]);
  }, [score, known]);

  const dismiss = (id) => setChanges((list) => list.filter((c) => c.id !== id));
  return { changes, dismiss };
}

export default function HouseCard({
  house, score, known, maxScore, isLeader, onClick, index,
}) {
  const meta = HOUSE_META[house];
  const reduced = useReducedMotion();
  const fillPercent = maxScore > 0 ? (score / maxScore) * 100 : 0;
  const shownScore = useCountUp(score, reduced);
  const { changes, dismiss } = useScoreChanges(score, known);
  const leading = isLeader && score > 0;
  // The glass catches the light once for every gain that is still on screen.
  const lastGain = changes.filter((change) => change.delta > 0).at(-1)?.id ?? 0;

  return (
    <motion.div
      className={`house-card house-card--${meta.id} ${leading ? 'house-card--leader' : ''}`}
      style={{ '--house-tint': meta.tint }}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      // Framer only fires hover for a real mouse, so phones get the tap instead.
      whileHover={reduced ? undefined : { y: -3 }}
      whileTap={reduced ? undefined : { scale: 0.985 }}
      onClick={() => onClick(house)}
    >
      {/* The house colour is only light: a soft glow behind the glass. */}
      <span className="house-card__light" aria-hidden="true" />

      {/* A score change makes that light swell once, or dip when points are taken. */}
      <AnimatePresence>
        {!reduced && changes.map((change) => (
          <motion.span
            key={`bloom-${change.id}`}
            className={`house-card__bloom ${change.delta < 0 ? 'house-card__bloom--minus' : ''}`}
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1.5, times: [0, 0.22, 1], ease: 'easeOut' }}
          />
        ))}
      </AnimatePresence>

      <div className="house-card__content">
        <div className="house-card__visual">
          <MagicFlask
            houseId={meta.id}
            fillPercent={fillPercent}
            flask={meta.flask}
            isLeader={leading}
            glintKey={lastGain}
          />

          <AnimatePresence>
            {changes.map((change) => (
              <motion.span
                key={`delta-${change.id}`}
                className={`house-card__delta ${change.delta < 0 ? 'house-card__delta--minus' : ''}`}
                initial={{ opacity: 0, y: 8 }}
                animate={reduced
                  ? { opacity: [0, 1, 1, 0] }
                  : { opacity: [0, 1, 1, 0], y: [8, 0, -4, -14] }}
                transition={{ duration: 1.7, times: [0, 0.16, 0.7, 1], ease: 'easeOut' }}
                onAnimationComplete={() => dismiss(change.id)}
              >
                {change.delta > 0 ? `+${change.delta}` : `−${Math.abs(change.delta)}`}
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
        <h3 className="house-card__name">{house}</h3>
        <div className="house-card__score-wrap">
          <span className="house-card__score">{shownScore}</span>
          <span className="house-card__label">баллов</span>
        </div>
        <div className="house-card__leader-slot">
          <AnimatePresence>
            {leading && (
              <motion.span
                key="leader"
                className="leader-badge"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              >
                <CrownIcon />
                Лидирует
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
