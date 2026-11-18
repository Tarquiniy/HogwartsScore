import { useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../api';
import { HOUSES, HOUSE_META } from '../constants';
import { Ornament } from './Icons';
import '../styles/welcome.css';

export default function WelcomeScreen({ onComplete }) {
  const [name, setName] = useState('');
  const [fio, setFio] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !fio.trim()) {
      setError('Заполните все поля');
      return;
    }

    setLoading(true);
    try {
      const session = await api.login(name.trim(), fio.trim());
      onComplete(session.userKey, session.fio, session.isAdmin);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="welcome">
      <motion.div
        className="welcome__card"
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      >
        {/* The four house flasks from the board instead of a cartoon castle emoji. */}
        <div className="welcome__crest" aria-hidden="true">
          {HOUSES.map((house, i) => (
            <motion.img
              key={house}
              className={`welcome__flask welcome__flask--${HOUSE_META[house].id}`}
              src={`/flasks/${HOUSE_META[house].id}.png?v=201`}
              alt=""
              draggable={false}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.1, duration: 0.5, ease: 'easeOut' }}
            />
          ))}
        </div>
        <h1 className="welcome__title">Кубок домов Хогвартс</h1>
        <Ornament />
        <p className="welcome__subtitle">
          Вход только для заранее зарегистрированных пользователей
        </p>

        <form className="welcome__form" onSubmit={handleSubmit}>
          <input
            className="welcome__input"
            type="text"
            placeholder="Ваше имя"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            autoComplete="username"
          />
          <input
            className="welcome__input"
            type="text"
            placeholder="Должность и ФИО"
            value={fio}
            onChange={(e) => setFio(e.target.value)}
            autoComplete="name"
          />
          {error && <p className="welcome__error">{error}</p>}
          <motion.button
            className="welcome__btn"
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? 'Проверка...' : 'Войти в замок'}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
