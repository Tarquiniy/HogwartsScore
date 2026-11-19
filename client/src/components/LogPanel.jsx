import { motion } from 'framer-motion';
import { api } from '../api';
import { ScrollIcon, CloseIcon } from './Icons';
import '../styles/log-panel.css';

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function splitLogMessage(entry) {
  const storedComment = entry.comment?.trim();
  if (storedComment) {
    const suffix = ` — ${storedComment}`;
    if (entry.message.endsWith(suffix)) {
      return {
        message: entry.message.slice(0, -suffix.length),
        comment: storedComment,
      };
    }
    return { message: entry.message, comment: storedComment };
  }

  const dashIndex = entry.message.lastIndexOf(' — ');
  if (dashIndex > 0) {
    const extracted = entry.message.slice(dashIndex + 3).trim();
    if (extracted.length >= 2) {
      return {
        message: entry.message.slice(0, dashIndex),
        comment: extracted,
      };
    }
  }

  return { message: entry.message, comment: null };
}

export default function LogPanel({ log, onClose, onClearLog, isAdmin = false }) {
  const handleClear = async () => {
    if (!isAdmin) return;
    if (!window.confirm('Очистить всю историю начислений? Это действие нельзя отменить.')) {
      return;
    }
    try {
      await onClearLog();
    } catch (err) {
      window.alert(err.message || 'Не удалось очистить историю');
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 550,
          background: 'rgba(0,0,0,0.4)',
        }}
        onClick={onClose}
      />
      <motion.div
        className="log-panel"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      >
        <div className="log-panel__header">
          <h2 className="log-panel__title"><ScrollIcon /> История баллов</h2>
          <button className="log-panel__close" onClick={onClose} aria-label="Закрыть"><CloseIcon /></button>
        </div>

        <div className="log-panel__list">
          {log.length === 0 ? (
            <p className="log-panel__empty">История пока пуста</p>
          ) : (
            log.map((entry) => {
              const { message, comment } = splitLogMessage(entry);
              return (
                <div key={entry.id} className={`log-entry log-entry--${entry.action}`}>
                  <p className="log-entry__message">{message}</p>
                  {comment && (
                    <p className="log-entry__comment">
                      <span className="log-entry__comment-label">Причина:</span> {comment}
                    </p>
                  )}
                  <p className="log-entry__time">{formatTime(entry.timestamp)}</p>
                </div>
              );
            })
          )}
        </div>

        <div className="log-panel__footer">
          <button
            type="button"
            className="log-panel__download"
            onClick={() => api.downloadLog()}
            disabled={log.length === 0}
          >
            Скачать history.txt
          </button>
          {isAdmin && (
            <button
              type="button"
              className="log-panel__clear"
              onClick={handleClear}
              disabled={log.length === 0}
            >
              Очистить историю
            </button>
          )}
        </div>
      </motion.div>
    </>
  );
}
