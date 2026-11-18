import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api';
import { CloseIcon } from './Icons';
import '../styles/users-admin.css';

export default function UsersAdminPanel({ adminKey, adminFio, onClose }) {
  const [users, setUsers] = useState([]);
  const [name, setName] = useState('');
  const [fio, setFio] = useState('');
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    const data = await api.listUsers(adminKey, adminFio);
    setUsers(data.users || []);
  }, [adminKey, adminFio]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refresh();
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    })();
    return () => { cancelled = true; };
  }, [refresh]);

  const handleCreate = async (event) => {
    event.preventDefault();
    setError('');
    setNote('');
    setLoading(true);
    try {
      await api.createUser(adminKey, adminFio, name, fio);
      setName('');
      setFio('');
      setNote('Пользователь добавлен');
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (userKey) => {
    if (!window.confirm(`Удалить пользователя «${userKey}»?`)) return;
    setError('');
    setNote('');
    setLoading(true);
    try {
      const data = await api.removeUser(adminKey, adminFio, userKey);
      setUsers(data.users || []);
      setNote('Пользователь удалён');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="users-admin-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="users-admin"
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.96 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="users-admin__header">
            <div>
              <h2 className="users-admin__title">Пользователи</h2>
              <p className="users-admin__subtitle">
                Только внесённые сюда связки «имя + должность/ФИО» смогут войти
              </p>
            </div>
            <button type="button" className="users-admin__close" onClick={onClose} aria-label="Закрыть">
              <CloseIcon />
            </button>
          </div>

          <form className="users-admin__form" onSubmit={handleCreate}>
            <input
              className="users-admin__input"
              type="text"
              placeholder="Имя (логин)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              required
            />
            <input
              className="users-admin__input"
              type="text"
              placeholder="Должность и ФИО"
              value={fio}
              onChange={(e) => setFio(e.target.value)}
              disabled={loading}
              required
            />
            <button className="users-admin__submit" type="submit" disabled={loading}>
              {loading ? '…' : 'Добавить'}
            </button>
          </form>

          {error && <p className="users-admin__error">{error}</p>}
          {note && !error && <p className="users-admin__note">{note}</p>}

          <ul className="users-admin__list">
            {users.map((user) => (
              <li key={user.userKey} className="users-admin__item">
                <div className="users-admin__meta">
                  <strong>
                    {user.userKey}
                    {user.isAdmin ? ' · админ' : ''}
                  </strong>
                  <span>{user.fio}</span>
                </div>
                {!user.isAdmin && (
                  <button
                    type="button"
                    className="users-admin__remove"
                    onClick={() => handleRemove(user.userKey)}
                    disabled={loading}
                  >
                    Удалить
                  </button>
                )}
              </li>
            ))}
          </ul>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
