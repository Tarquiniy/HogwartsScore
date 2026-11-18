import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import WelcomeScreen from './components/WelcomeScreen';
import Dashboard from './components/Dashboard';
import MagicSky from './components/MagicSky';
import PwaInstallBanner from './components/PwaInstallBanner';
import { api } from './api';
import { USER_KEY, USER_FIO } from './constants';
import './styles/App.css';

export default function App() {
  const [userKey, setUserKey] = useState(() => localStorage.getItem(USER_KEY));
  const [userFio, setUserFio] = useState(() => localStorage.getItem(USER_FIO));
  const [scores, setScores] = useState({});
  const [log, setLog] = useState([]);
  const [toast, setToast] = useState(null);
  const [authChecking, setAuthChecking] = useState(() => Boolean(localStorage.getItem(USER_KEY)));

  const clearSession = useCallback(() => {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(USER_FIO);
    setUserKey(null);
    setUserFio(null);
  }, []);

  const loadData = useCallback(async () => {
    const [s, l] = await Promise.all([api.getScores(), api.getLog()]);
    setScores(s);
    setLog(l);
  }, []);

  // A saved session only sticks if the whitelist still contains the same pair.
  useEffect(() => {
    if (!userKey || !userFio) {
      setAuthChecking(false);
      return undefined;
    }

    let cancelled = false;
    setAuthChecking(true);
    (async () => {
      try {
        const session = await api.login(userKey, userFio);
        if (cancelled) return;
        localStorage.setItem(USER_KEY, session.userKey);
        localStorage.setItem(USER_FIO, session.fio);
        setUserKey(session.userKey);
        setUserFio(session.fio);
      } catch {
        if (!cancelled) clearSession();
      } finally {
        if (!cancelled) setAuthChecking(false);
      }
    })();

    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- only on mount

  useEffect(() => {
    if (userKey && !authChecking) loadData();
  }, [userKey, authChecking, loadData]);

  useEffect(() => {
    if (!userKey || authChecking) return undefined;

    const unsubscribe = api.subscribeScores(setScores);
    const resync = () => {
      if (document.visibilityState === 'visible') loadData();
    };

    const poll = setInterval(resync, 20_000);

    document.addEventListener('visibilitychange', resync);
    return () => {
      unsubscribe();
      clearInterval(poll);
      document.removeEventListener('visibilitychange', resync);
    };
  }, [userKey, authChecking, loadData]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleWelcome = (key, fio) => {
    localStorage.setItem(USER_KEY, key);
    localStorage.setItem(USER_FIO, fio);
    setUserKey(key);
    setUserFio(fio);
    setAuthChecking(false);
  };

  const handleLogout = () => {
    clearSession();
  };

  return (
    <div className="app">
      <div className="app__bg" />
      <MagicSky />
      <div className="app__content">
        {authChecking ? (
          <div className="welcome">
            <p className="welcome__subtitle" style={{ textAlign: 'center', marginTop: '30vh' }}>
              Проверка доступа…
            </p>
          </div>
        ) : !userKey ? (
          <WelcomeScreen onComplete={handleWelcome} />
        ) : (
          <Dashboard
            userKey={userKey}
            userFio={userFio}
            scores={scores}
            log={log}
            onScoresUpdate={setScores}
            onLogUpdate={setLog}
            onLogout={handleLogout}
          />
        )}
      </div>

      <PwaInstallBanner />

      <AnimatePresence>
        {toast && (
          <motion.div
            className={`toast toast--${toast.type}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
