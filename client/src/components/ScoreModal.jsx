import { useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { HOUSE_META } from '../constants';
import { api } from '../api';
import '../styles/modal.css';

const QUICK_VALUES = [1, 5, 10, 25, 50];

export default function ScoreModal({ house, userFio, onClose, onSuccess }) {
  const [action, setAction] = useState('add');
  const [amount, setAmount] = useState('');
  const [comment, setComment] = useState('');
  const commentRef = useRef('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const meta = HOUSE_META[house];

  const submitPoints = useCallback(async (nextAction, nextAmount) => {
    setError('');
    const num = Number.parseInt(String(nextAmount), 10);
    if (!nextAmount || Number.isNaN(num) || num <= 0) {
      setError('Это не число, попробуйте ещё раз');
      return;
    }

    setLoading(true);
    try {
      const fn = nextAction === 'add' ? api.addPoints : api.subtractPoints;
      const result = await fn(house, num, userFio, commentRef.current);
      onSuccess(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [house, onSuccess, userFio]);

  const handleSubmit = () => submitPoints(action, amount);

  // The exit animation is driven by the AnimatePresence around this modal in the
  // dashboard; a second one in here only got in its way.
  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="modal"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__header">
          <img
            className="modal__flask"
            src={`/flasks/${meta.id}.png?v=201`}
            alt=""
            draggable={false}
          />
          <h2 className="modal__title">{house}</h2>
          <p className="modal__subtitle">Выберите действие и введите количество баллов</p>
        </div>

        <div className="modal__actions">
          <button
            type="button"
            className={`modal__action-btn modal__action-btn--add ${action === 'add' ? 'active' : ''}`}
            aria-pressed={action === 'add'}
            onClick={() => setAction('add')}
          >
            + Добавить
          </button>
          <button
            type="button"
            className={`modal__action-btn modal__action-btn--sub ${action === 'sub' ? 'active' : ''}`}
            aria-pressed={action === 'sub'}
            onClick={() => setAction('sub')}
          >
            − Вычесть
          </button>
        </div>

        <div className="modal__quick">
          {QUICK_VALUES.map((v) => (
            <button
              key={v}
              className="modal__quick-btn"
              onClick={() => setAmount(String(v))}
            >
              {v}
            </button>
          ))}
        </div>

        <input
          className="modal__input"
          type="number"
          min="1"
          placeholder="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          autoFocus
        />

        <textarea
          className="modal__comment"
          placeholder="Причина (необязательно)"
          value={comment}
          onChange={(e) => {
            commentRef.current = e.target.value;
            setComment(e.target.value);
          }}
          maxLength={500}
          rows={2}
        />

        {error && <p className="modal__error">{error}</p>}

        <div className="modal__footer">
          <button className="modal__btn modal__btn--ghost" onClick={onClose}>
            Отмена
          </button>
          <button
            className={`modal__btn modal__btn--primary modal__btn--${action === 'add' ? 'add' : 'sub'}`}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? '...' : action === 'add' ? 'Начислить' : 'Вычесть'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
