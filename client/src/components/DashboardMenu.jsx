import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UsersIcon, ResetIcon, TrashIcon, ExitIcon,
} from './Icons';
import '../styles/dashboard-menu.css';

export default function DashboardMenu({
  onResetScores,
  onClearLog,
  onLogout,
  onManageUsers,
  userFio = '',
  isAdmin = false,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const runAction = (action) => {
    setOpen(false);
    action();
  };

  return (
    <div className="dashboard-menu" ref={rootRef}>
      <button
        type="button"
        className={`dashboard-menu__toggle ${open ? 'dashboard-menu__toggle--open' : ''}`}
        onClick={() => setOpen((value) => !value)}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Меню управления"
        title="Меню"
      >
        ⋮
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="dashboard-menu__dropdown"
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.15 }}
          >
            {userFio && (
              <div className="dashboard-menu__who">
                <span className="dashboard-menu__who-name">{userFio}</span>
                {isAdmin && <span className="dashboard-menu__who-role">администратор</span>}
              </div>
            )}
            {isAdmin && (
              <button
                type="button"
                className="dashboard-menu__item"
                role="menuitem"
                onClick={() => runAction(onManageUsers)}
              >
                <span className="dashboard-menu__icon"><UsersIcon /></span>
                Пользователи
              </button>
            )}
            <button
              type="button"
              className="dashboard-menu__item dashboard-menu__item--danger"
              role="menuitem"
              onClick={() => runAction(onResetScores)}
            >
              <span className="dashboard-menu__icon"><ResetIcon /></span>
              Обнулить баллы
            </button>
            <button
              type="button"
              className="dashboard-menu__item dashboard-menu__item--danger"
              role="menuitem"
              onClick={() => runAction(onClearLog)}
            >
              <span className="dashboard-menu__icon"><TrashIcon /></span>
              Очистить историю
            </button>
            <div className="dashboard-menu__divider" />
            <button
              type="button"
              className="dashboard-menu__item"
              role="menuitem"
              onClick={() => runAction(onLogout)}
            >
              <span className="dashboard-menu__icon"><ExitIcon /></span>
              Выйти
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
